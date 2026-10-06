import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { NRelay1, type NostrEvent, type NostrFilter } from '@nostrify/nostrify';
import { SUGGESTED_RELAYS } from '@/data/presets';
import { pickEvent, type PickMode } from '@/lib/pickEvent';
import { normalizeRelayUrl } from '@/lib/relays';
import type { EventVerification, RefExpectations } from '@/lib/verifyEvent';

const RELAY_TIMEOUT_MS = 8000;

export type RelayStatus = 'pending' | 'found' | 'outdated' | 'invalid' | 'missing' | 'error';

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

export interface RelayLookup {
  /** Identifies the lookup in the query cache. */
  key: string;
  relayHints: string[];
  filter: NostrFilter;
  /** Discards events a relay returns that don't answer the filter. */
  accept(event: NostrEvent): boolean;
  expectations: RefExpectations;
  mode: PickMode;
}

/** Relay hints first, then the fallback relays, without duplicates. */
function relaysFor(hints: string[]): { url: string; fromLink: boolean }[] {
  const seen = new Set<string>();
  const result: { url: string; fromLink: boolean }[] = [];
  const add = (url: string, fromLink: boolean) => {
    const key = url.replace(/\/+$/, '');
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ url, fromLink });
  };
  hints.forEach(url => add(url, true));
  SUGGESTED_RELAYS.forEach(url => add(normalizeRelayUrl(url), false));
  return result;
}

/** The newest accepted event the relay returns, or null. */
async function fetchFromRelay(url: string, lookup: RelayLookup, signal: AbortSignal): Promise<NostrEvent | null> {
  // Accept events with a bad signature: the page reports them instead of hiding them
  const relay = new NRelay1(url, { verifyEvent: () => true, backoff: false });
  try {
    const events = await relay.query([lookup.filter], {
      signal: AbortSignal.any([signal, AbortSignal.timeout(RELAY_TIMEOUT_MS)]),
    });
    return events
      .filter(e => lookup.accept(e))
      .reduce<NostrEvent | null>((acc, e) => (!acc || e.created_at > acc.created_at ? e : acc), null);
  } finally {
    relay.close();
  }
}

type QueryState = 'pending' | 'error' | 'returned' | 'missing';

// Module-level so React Query can memoize the combined result between renders
function combineResults(results: UseQueryResult<NostrEvent | null>[]) {
  return {
    events: results.map(r => r.data ?? undefined),
    states: results.map((r): QueryState => (r.isPending ? 'pending' : r.isError ? 'error' : r.data ? 'returned' : 'missing')),
  };
}

/** Queries every relay in parallel; each relay's answer arrives on its own. Pass null to skip. */
export function useRelayLookup(lookup: RelayLookup | null): EventLookup {
  const relays = useMemo(() => (lookup ? relaysFor(lookup.relayHints) : []), [lookup]);

  const { events, states } = useQueries({
    queries: relays.map(({ url }) => ({
      queryKey: ['relay-lookup', lookup?.key, url],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchFromRelay(url, lookup!, signal),
      enabled: !!lookup,
      retry: false,
      staleTime: Infinity,
    })),
    combine: combineResults,
  });

  const { best, statuses } = useMemo(
    () => (lookup ? pickEvent(events, lookup.expectations, lookup.mode) : { best: undefined, statuses: [] }),
    [events, lookup],
  );

  return {
    event: best?.event,
    verification: best?.verification,
    relays: relays.map(({ url, fromLink }, i) => {
      const state = states[i] ?? 'pending';
      return { url, fromLink, status: state === 'returned' ? statuses[i] ?? 'found' : state };
    }),
    isSearching: states.includes('pending'),
  };
}
