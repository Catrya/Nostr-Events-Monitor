import { useMemo } from 'react';
import { kinds } from 'nostr-tools';
import type { NostrFilter } from '@nostrify/nostrify';
import type { AddressRef } from '@/lib/eventRef';
import { useRelayLookup, type EventLookup, type RelayLookup } from '@/hooks/useRelayLookup';

/** Looks up the latest version of an addressable (or replaceable) event on the link's relays and the fallback relays. */
export function useAddressableEvent(ref: AddressRef | null): EventLookup {
  const lookup = useMemo((): RelayLookup | null => {
    if (!ref) return null;
    // Replaceable kinds (0, 3, 10000–19999) have no d tag: one event per kind and author
    const replaceable = kinds.isReplaceableKind(ref.kind);
    const filter: NostrFilter = { kinds: [ref.kind], authors: [ref.author], limit: 1 };
    if (!replaceable) filter['#d'] = [ref.identifier];
    return {
      key: `address:${ref.kind}:${ref.author}:${ref.identifier}`,
      relayHints: ref.relays,
      filter,
      accept: e => e.kind === ref.kind && e.pubkey === ref.author
        && (replaceable || (Array.isArray(e.tags) && (e.tags.find(t => t[0] === 'd')?.[1] ?? '') === ref.identifier)),
      expectations: replaceable ? { author: ref.author, kind: ref.kind } : ref,
      mode: 'latest',
    };
  }, [ref]);

  return useRelayLookup(lookup);
}
