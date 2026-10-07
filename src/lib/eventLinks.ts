import { kinds, nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

/** Relay hints to put in a link: enough to find the event, short enough to share. */
const MAX_LINK_RELAYS = 3;

/** Addressable and replaceable kinds: their author can publish newer versions. */
export function isVersioned(kind: number): boolean {
  return kinds.isAddressableKind(kind) || kinds.isReplaceableKind(kind);
}

/** The `d` tag of an addressable event; empty for replaceable kinds, which have none. */
export function identifierOf(event: NostrEvent): string {
  if (!kinds.isAddressableKind(event.kind) || !Array.isArray(event.tags)) return '';
  return event.tags.find(t => t[0] === 'd')?.[1] ?? '';
}

/** `kind:pubkey:d` for addressable and replaceable events (NIP-01), undefined otherwise. */
export function eventAddress(event: NostrEvent): string | undefined {
  return isVersioned(event.kind) ? `${event.kind}:${event.pubkey}:${identifierOf(event)}` : undefined;
}

/** Path of the page for this exact event: `/e/nevent1…`. */
export function eventPath(event: NostrEvent, relays: string[] = []): string {
  return `/e/${nip19.neventEncode({ id: event.id, author: event.pubkey, kind: event.kind, relays: relays.slice(0, MAX_LINK_RELAYS) })}`;
}

/** Path of the page for the latest version of this event's address: `/a/naddr1…`. */
export function addressPath(event: NostrEvent, relays: string[] = []): string {
  return `/a/${nip19.naddrEncode({ kind: event.kind, pubkey: event.pubkey, identifier: identifierOf(event), relays: relays.slice(0, MAX_LINK_RELAYS) })}`;
}
