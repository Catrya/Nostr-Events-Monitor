import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { ArrowLeft, Check, ChevronDown, CircleCheck, CircleMinus, CircleX, Copy, Info, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { JsonViewer } from '@/components/JsonViewer';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useEventById, type RelayResult } from '@/hooks/useEventById';
import { getKindInfo } from '@/data/kindInfo';
import { parseEventRef } from '@/lib/eventRef';
import type { EventVerification } from '@/lib/verifyEvent';
import { cn } from '@/lib/utils';

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok
        ? <CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-green-500" aria-label="ok" />
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
  found: { label: 'has it', icon: <CircleCheck className="h-3.5 w-3.5 text-green-500" /> },
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
          {fromLink && <Badge variant="outline" className="text-[10px] shrink-0 whitespace-nowrap">from link</Badge>}
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

/** Signature and id always; author and kind only when the link includes them. */
function countChecks(v: EventVerification) {
  const checks = [v.signatureValid, v.idValid, v.authorMatches, v.kindMatches].filter((c): c is boolean => c !== undefined);
  return { passed: checks.filter(Boolean).length, total: checks.length };
}

function relaysSummary(relays: RelayResult[], isSearching: boolean): string {
  const found = relays.filter(r => r.status === 'found').length;
  const foundText = `Found on ${found} relay${found !== 1 ? 's' : ''}`;
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

export function EventPage() {
  const { ref: param = '' } = useParams();
  const parsed = useMemo(() => parseEventRef(param), [param]);
  const ref = parsed.ok ? parsed.ref : null;
  const { event, verification, relays, isSearching } = useEventById(ref);
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  useSeoMeta({
    title: ref ? `Event ${ref.id.slice(0, 8)}… | Nostr Event Monitor` : 'Event | Nostr Event Monitor',
    description: 'Inspect and verify a Nostr event: signature, id, relays and raw JSON.',
  });

  let body: ReactNode;
  if (!parsed.ok && parsed.error === 'unsupported') {
    body = (
      <Message title="Link type not supported yet">
        <p>
          This is a <code translate="no">{parsed.type}</code> link. Only links to a single event are supported for now:{' '}
          <code translate="no">nevent1…</code>, <code translate="no">note1…</code> or a hex event id.
        </p>
      </Message>
    );
  } else if (!ref) {
    body = (
      <Message title="Invalid event link">
        <p>
          Use <code translate="no">/e/</code> followed by a <code translate="no">nevent1…</code>,{' '}
          <code translate="no">note1…</code> or a 64-character hex event id.
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
            <p>None of these relays returned the event. It may have been deleted, or it lives on other relays.</p>
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
    const { passed, total } = countChecks(verification!);
    const allPassed = passed === total;
    body = (
      <>
        <Card className="panel-corner border-accent/20 bg-card/50 divide-y divide-accent/10">
          <Section
            key={`${event.id}-${event.sig}`}
            icon={allPassed
              ? <CircleCheck className="h-4 w-4 text-green-500" />
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
                    {`${kindInfo.nip} ${kindInfo.description}`}
                  </a>
                ) : (
                  <span>{kindInfo.description}</span>
                )}
              </dd>
              <dt className="text-muted-foreground">Author</dt>
              <dd translate="no" className="font-mono text-xs break-all">{nip19.npubEncode(event.pubkey)}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd translate="no">{new Date(event.created_at * 1000).toLocaleString()}</dd>
              <dt className="text-muted-foreground">Id</dt>
              <dd translate="no" className="font-mono text-xs break-all">{event.id}</dd>
            </dl>
          </Section>

          <Section
            icon={isSearching
              ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
              : <CircleCheck className="h-4 w-4 text-green-500" />}
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
              {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="topbar">
        <div className="topbar-inner" style={{ justifyContent: 'flex-start' }}>
          <Link to="/" className="status-pill clickable">
            <ArrowLeft className="h-3 w-3" />
            <span>Nostr Event Monitor</span>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-semibold">Nostr event</h1>
        {body}
      </div>
    </div>
  );
}

export default EventPage;
