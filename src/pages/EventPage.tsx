import { useMemo, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useHead, useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { ArrowLeft, Check, ChevronDown, CircleCheck, CircleMinus, CircleX, Copy, Info, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { JsonViewer } from '@/components/JsonViewer';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useEventById, type RelayResult } from '@/hooks/useEventById';
import { useAddressableEvent } from '@/hooks/useAddressableEvent';
import { getKindInfo } from '@/data/kindInfo';
import { parseAddressRef, parseEventRef, type AddressRef } from '@/lib/eventRef';
import { addressPath, eventAddress, identifierOf, isVersioned } from '@/lib/eventLinks';
import { isNewer } from '@/lib/pickEvent';
import type { EventVerification } from '@/lib/verifyEvent';
import { cn } from '@/lib/utils';

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok
        ? <CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-ok" aria-label="ok" />
        : <CircleX className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-label="failed" />}
      <div>
        <div className={ok ? 'text-foreground' : 'text-destructive'}>{label}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

const RELAY_STATUS: Record<RelayResult['status'], { label: string; icon: ReactNode }> = {
  pending: { label: 'searching…', icon: <LoaderCircle className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> },
  found: { label: 'has it', icon: <CircleCheck className="h-3.5 w-3.5 text-ok" /> },
  outdated: { label: 'older version', icon: <CircleMinus className="h-3.5 w-3.5 text-warn" /> },
  invalid: { label: 'invalid copy', icon: <CircleX className="h-3.5 w-3.5 text-destructive" /> },
  missing: { label: 'not found', icon: <CircleMinus className="h-3.5 w-3.5 text-muted-foreground" /> },
  error: { label: 'unreachable', icon: <CircleX className="h-3.5 w-3.5 text-destructive" /> },
};

function RelayList({ relays }: { relays: RelayResult[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {relays.map(({ url, status, fromLink }) => (
        <li key={url} className="flex items-center gap-2">
          <span className="shrink-0">{RELAY_STATUS[status].icon}</span>
          <span translate="no" className="font-mono text-xs min-w-0 truncate">{url}</span>
          {fromLink && <Badge variant="outline" className="text-2xs shrink-0 whitespace-nowrap">from link</Badge>}
          <span key={status} className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted-foreground">{RELAY_STATUS[status].label}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ icon, summary, summaryClassName, defaultOpen = false, children }: {
  icon: ReactNode;
  summary: string;
  summaryClassName?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="overflow-hidden first:rounded-t-lg last:rounded-b-lg">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent">
        <span className="shrink-0">{icon}</span>
        <span key={summary} className={cn('min-w-0 flex-1', summaryClassName)}>{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** Signature and id always; author, kind and d tag only when the link includes them. */
function countChecks(v: EventVerification) {
  const checks = [v.signatureValid, v.idValid, v.authorMatches, v.kindMatches, v.identifierMatches].filter((c): c is boolean => c !== undefined);
  return { passed: checks.filter(Boolean).length, total: checks.length };
}

function relaysSummary(relays: RelayResult[], isSearching: boolean): string {
  const found = relays.filter(r => r.status === 'found').length;
  const outdated = relays.filter(r => r.status === 'outdated').length;
  const foundText = `Found on ${found} relay${found !== 1 ? 's' : ''}${outdated ? ` · ${outdated} outdated` : ''}`;
  return isSearching ? `${foundText} · checking ${relays.length}…` : `${foundText} · ${relays.length} checked`;
}


function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state panel-corner">
      <h3 className="empty-title">{title}</h3>
      <div className="empty-desc space-y-2">{children}</div>
    </div>
  );
}

/**
 * - `id` (`/e/:ref`): one exact event, by nevent, note or hex id.
 * - `address` (`/a/:ref`): the latest version of an addressable event, by naddr.
 */
export function EventPage({ mode = 'id' }: { mode?: 'id' | 'address' }) {
  const { ref: param = '' } = useParams();
  const eventParsed = useMemo(() => parseEventRef(param), [param]);
  const addressParsed = useMemo(() => parseAddressRef(param), [param]);
  const eventRef = mode === 'id' && eventParsed.ok ? eventParsed.ref : null;
  const addressRef = mode === 'address' && addressParsed.ok ? addressParsed.ref : null;
  const byId = useEventById(eventRef);

  // On /e/, a valid addressable event may have been replaced: look up its latest version too
  const found = byId.event;
  const foundValid = byId.verification?.signatureValid ?? false;
  const latestRef = useMemo((): AddressRef | null => {
    if (!eventRef || !found || !foundValid || !isVersioned(found.kind)) return null;
    return { kind: found.kind, author: found.pubkey, identifier: identifierOf(found), relays: eventRef.relays };
  }, [eventRef, found, foundValid]);

  const byAddress = useAddressableEvent(addressRef ?? latestRef);
  const { event, verification, relays, isSearching } = mode === 'id' ? byId : byAddress;

  const newer = mode === 'id' && found && byAddress.event && byAddress.verification?.signatureValid
    && isNewer(byAddress.event, found)
    ? byAddress.event
    : undefined;
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  useSeoMeta({
    title: eventRef
      ? `Event ${eventRef.id.slice(0, 8)}… | Nostr Inspect`
      : addressRef
        ? `Event ${addressRef.kind}:${addressRef.identifier.slice(0, 8)} | Nostr Inspect`
        : 'Event | Nostr Inspect',
    description: 'Inspect and verify a Nostr event: signature, id, relays and raw JSON.',
    // Thousands of single-event pages: keep them out of search results, the home page is what should rank
    robots: 'noindex',
  });
  // The HTML shell's canonical points to the home page; an event page is its own page, not a copy of it
  useHead({ link: [{ rel: 'canonical', href: `https://nostrinspect.com/${mode === 'id' ? 'e' : 'a'}/${param}` }] });

  // A link pasted under the wrong prefix goes to the right page
  if (mode === 'id' && !eventParsed.ok && addressParsed.ok) return <Navigate to={`/a/${param}`} replace />;
  if (mode === 'address' && eventParsed.ok) return <Navigate to={`/e/${param}`} replace />;

  const parsed = mode === 'id' ? eventParsed : addressParsed;
  const ref = eventRef ?? addressRef;

  let body: ReactNode;
  if (!parsed.ok && parsed.error === 'unsupported') {
    body = (
      <Message title="Link type not supported">
        <p>
          This is a <code translate="no">{parsed.type}</code> link. Event pages accept{' '}
          <code translate="no">nevent1…</code>, <code translate="no">note1…</code>, a hex event id or{' '}
          <code translate="no">naddr1…</code>.
        </p>
      </Message>
    );
  } else if (!ref) {
    body = mode === 'id' ? (
      <Message title="Invalid event link">
        <p>
          Use <code translate="no">/e/</code> followed by a <code translate="no">nevent1…</code>,{' '}
          <code translate="no">note1…</code> or a 64-character hex event id.
        </p>
      </Message>
    ) : (
      <Message title="Invalid address link">
        <p>
          Use <code translate="no">/a/</code> followed by a <code translate="no">naddr1…</code>.
        </p>
      </Message>
    );
  } else if (!event) {
    body = (
      <>
        {isSearching ? (
          <div className="flex items-center justify-center gap-2 py-6 text-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
            <span key="searching">{`Searching ${relays.length} relays…`}</span>
          </div>
        ) : (
          <Message title="Event not found">
            <p>
              {mode === 'id'
                ? 'None of these relays returned the event. It may have been deleted, or it lives on other relays.'
                : 'None of these relays returned any version of this event. It may have been deleted, or it lives on other relays.'}
            </p>
            {eventRef?.kind !== undefined && isVersioned(eventRef.kind) && (
              <p>
                This kind of event gets replaced by newer versions, and relays usually keep only the latest one,
                so this version may be gone. A <code translate="no">naddr1…</code> link always points to the latest version.
              </p>
            )}
          </Message>
        )}
        <Card className="border-accent/20 bg-card/50">
          <CardContent className="p-4">
            <RelayList relays={relays} />
          </CardContent>
        </Card>
      </>
    );
  } else {
    const kindInfo = getKindInfo(event.kind);
    const address = eventAddress(event);
    const { passed, total } = countChecks(verification!);
    const allPassed = passed === total;
    body = (
      <>
        {newer && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-sm">
            <Info className="h-4 w-4 shrink-0 text-warn" />
            <span key={newer.id} className="min-w-0 flex-1">
              {`A newer version of this event exists (published ${new Date(newer.created_at * 1000).toLocaleString()}).`}
            </span>
            <Link
              to={addressPath(newer, eventRef?.relays)}
              className="shrink-0 text-accent hover:underline"
            >
              View latest →
            </Link>
          </div>
        )}
        <Card className="panel-corner border-accent/20 bg-card/50 divide-y divide-accent/10">
          <Section
            key={`${event.id}-${event.sig}`}
            icon={allPassed
              ? <CircleCheck className="h-4 w-4 text-ok" />
              : <CircleX className="h-4 w-4 text-destructive" />}
            summary={`${allPassed ? 'Verified' : 'Verification failed'} · ${passed} of ${total} checks passed`}
            summaryClassName={allPassed ? undefined : 'text-destructive'}
            defaultOpen={!allPassed}
          >
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <CheckRow
                ok={verification!.signatureValid}
                label={verification!.signatureValid ? 'Signature valid' : 'Signature invalid'}
                detail="Checked in this browser against the author's public key."
              />
              <CheckRow
                ok={verification!.idValid}
                label={verification!.idValid ? 'Id matches content' : 'Id does not match content'}
                detail="The id is the hash of the event, so the content was not altered."
              />
              {verification!.authorMatches !== undefined && (
                <CheckRow
                  ok={verification!.authorMatches}
                  label={verification!.authorMatches ? 'Author matches link' : 'Author differs from link'}
                  detail="The link says who published the event."
                />
              )}
              {verification!.kindMatches !== undefined && (
                <CheckRow
                  ok={verification!.kindMatches}
                  label={verification!.kindMatches ? 'Kind matches link' : 'Kind differs from link'}
                  detail="The link says which kind of event it is."
                />
              )}
              {verification!.identifierMatches !== undefined && (
                <CheckRow
                  ok={verification!.identifierMatches}
                  label={verification!.identifierMatches ? 'd tag matches link' : 'd tag differs from link'}
                  detail="The link says which addressable event it is."
                />
              )}
            </div>
          </Section>

          <Section
            icon={<Info className="h-4 w-4 text-muted-foreground" />}
            summary={`Kind ${event.kind} · ${kindInfo.nip ? `${kindInfo.nip} ` : ''}${kindInfo.description}`}
          >
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
              <dt className="text-muted-foreground">Kind</dt>
              <dd>
                <span translate="no" className="font-mono">{event.kind}</span>
                {' · '}
                {kindInfo.link ? (
                  <a href={kindInfo.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    {kindInfo.nip ? `${kindInfo.nip} ${kindInfo.description}` : kindInfo.description}
                  </a>
                ) : (
                  <span>{kindInfo.description}</span>
                )}
                {kindInfo.unrecommended && (
                  <div className="text-xs text-warn">{`${kindInfo.nip} is unrecommended: ${kindInfo.unrecommended}.`}</div>
                )}
              </dd>
              <dt className="text-muted-foreground">Author</dt>
              <dd translate="no" className="font-mono text-xs break-all">{nip19.npubEncode(event.pubkey)}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd translate="no">{new Date(event.created_at * 1000).toLocaleString()}</dd>
              <dt className="text-muted-foreground">Id</dt>
              <dd translate="no" className="font-mono text-xs break-all">{event.id}</dd>
              {address && (
                <>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd translate="no" className="font-mono text-xs break-all">{address}</dd>
                </>
              )}
            </dl>
          </Section>

          <Section
            icon={isSearching
              ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
              : <CircleCheck className="h-4 w-4 text-ok" />}
            summary={relaysSummary(relays, isSearching)}
          >
            <RelayList relays={relays} />
          </Section>
        </Card>

        <Card className="border-accent/20 bg-card/50 relative">
          <div className="flex justify-end p-4 pb-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(event, null, 2))}
              className="h-8 text-xs gap-1.5"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
              <span key={String(isCopied)}>{isCopied ? 'Copied' : 'Copy JSON'}</span>
            </Button>
          </div>
          <CardContent className="p-4 pt-2" translate="no">
            <JsonViewer data={event} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <div className="topbar">
        <div className="topbar-inner" style={{ justifyContent: 'flex-start' }}>
          <Link to="/" className="status-pill clickable">
            <ArrowLeft className="h-3 w-3" />
            <span>Nostr Inspect</span>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-semibold">Nostr event</h1>
        {mode === 'address' && (
          <p className="text-sm text-muted-foreground">
            Latest version of an addressable event. Its author can replace it with newer versions.
          </p>
        )}
        {body}
      </div>
    </div>
  );
}

export default EventPage;
