import { useMemo } from 'react';
import type { EventRef } from '@/lib/eventRef';
import { useRelayLookup, type EventLookup, type RelayLookup } from '@/hooks/useRelayLookup';

export type { EventLookup, RelayResult, RelayStatus } from '@/hooks/useRelayLookup';

/** Looks up one event by id on the link's relays and the fallback relays. */
export function useEventById(ref: EventRef | null): EventLookup {
  const lookup = useMemo((): RelayLookup | null => ref && {
    key: `id:${ref.id}`,
    relayHints: ref.relays,
    filter: { ids: [ref.id], limit: 1 },
    accept: e => e.id === ref.id,
    expectations: ref,
    mode: 'first',
  }, [ref]);

  return useRelayLookup(lookup);
}
