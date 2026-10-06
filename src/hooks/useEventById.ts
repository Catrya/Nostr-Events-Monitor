import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { NRelay1, type NostrEvent } from '@nostrify/nostrify';
import { SUGGESTED_RELAYS } from '@/data/presets';
import type { EventRef } from '@/lib/eventRef';
import { normalizeRelayUrl } from '@/lib/relays';
import { checkEvent, type EventVerification } from '@/lib/verifyEvent';

const RELAY_TIMEOUT_MS = 8000;

export type RelayStatus = 'pending' | 'found' | 'missing' | 'error';

export interface RelayResult {
  url: string;
  status: RelayStatus;
  /** The relay came from the link itself, not from the fallback list. */
  fromLink: boolean;
}

export interface EventLookup {
  event?: NostrEvent;
  verification?: EventVerification;
  relays: RelayResult[];
  /** Some relay has not answered yet. */
  isSearching: boolean;
}

/** Relay hints first, then the fallback relays, without duplicates. */
function relaysFor(ref: EventRef): { url: string; fromLink: boolean }[] {
  const seen = new Set<string>();
  const result: { url: string; fromLink: boolean }[] = [];
  const add = (url: string, fromLink: boolean) => {
    const key = url.replace(/\/+$/, '');
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ url, fromLink });
  };
  ref.relays.forEach(url => add(url, true));
  SUGGESTED_RELAYS.forEach(url => add(normalizeRelayUrl(url), false));
  return result;
}

async function fetchFromRelay(url: string, id: string, signal: AbortSignal): Promise<NostrEvent | null> {
  // Accept events with a bad signature: the page reports it instead of hiding the event
  const relay = new NRelay1(url, { verifyEvent: () => true, backoff: false });
  try {
    const events = await relay.query([{ ids: [id], limit: 1 }], {
      signal: AbortSignal.any([signal, AbortSignal.timeout(RELAY_TIMEOUT_MS)]),
    });
    return events.find(e => e.id === id) ?? null;
  } finally {
    relay.close();
  }
}

// Module-level so React Query can memoize the combined result between renders
function combineResults(results: UseQueryResult<NostrEvent | null>[]) {
  return {
    events: results.map(r => r.data ?? undefined),
    statuses: results.map((r): RelayStatus => r.isPending ? 'pending' : r.isError ? 'error' : r.data ? 'found' : 'missing'),
  };
}

/** Looks up one event by id on every relay in parallel; each relay's result arrives on its own. */
export function useEventById(ref: EventRef | null): EventLookup {
  const relays = useMemo(() => (ref ? relaysFor(ref) : []), [ref]);

  const { events, statuses } = useQueries({
    queries: relays.map(({ url }) => ({
      queryKey: ['event-by-id', ref?.id, url],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchFromRelay(url, ref!.id, signal),
      enabled: !!ref,
      retry: false,
      staleTime: Infinity,
    })),
    combine: combineResults,
  });

  // Prefer a copy that passes verification, in case relays disagree
  const best = useMemo(() => {
    let first: { event: NostrEvent; verification: EventVerification } | undefined;
    for (const event of events) {
      if (!event) continue;
      const verification = checkEvent(event, ref ?? undefined);
      if (verification.signatureValid) return { event, verification };
      first ??= { event, verification };
    }
    return first;
  }, [events, ref]);

  return {
    event: best?.event,
    verification: best?.verification,
    relays: relays.map(({ url, fromLink }, i) => ({ url, fromLink, status: statuses[i] ?? 'pending' })),
    isSearching: statuses.includes('pending'),
  };
}
