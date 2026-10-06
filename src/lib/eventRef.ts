import { nip19 } from 'nostr-tools';
import { normalizeRelayUrl, isValidWebSocketUrl } from '@/lib/relays';

/** What is needed to find a single event on relays. */
export interface EventRef {
  id: string;
  /** Relay hints from the reference (normalized, deduplicated). */
  relays: string[];
  author?: string;
  kind?: number;
}

/** What is needed to find the latest version of an addressable (or replaceable) event. */
export interface AddressRef {
  kind: number;
  author: string;
  /** The `d` tag; empty for replaceable kinds. */
  identifier: string;
  /** Relay hints from the reference (normalized, deduplicated). */
  relays: string[];
}

export type EventRefResult =
  | { ok: true; ref: EventRef }
  /** `unsupported` is a valid NIP-19 entity that does not point to a single event by id (e.g. naddr, npub). */
  | { ok: false; error: 'invalid' }
  | { ok: false; error: 'unsupported'; type: string };

export type AddressRefResult =
  | { ok: true; ref: AddressRef }
  | { ok: false; error: 'invalid' }
  | { ok: false; error: 'unsupported'; type: string };

const HEX_ID = /^[0-9a-f]{64}$/;

function cleanInput(input: string): string {
  return input.trim().replace(/^nostr:/i, '').toLowerCase();
}

function cleanRelays(relays: string[] = []): string[] {
  return [...new Set(relays.filter(isValidWebSocketUrl).map(normalizeRelayUrl))];
}

/** Parses an event reference: nevent1…, note1…, a 64-char hex id, optionally prefixed with `nostr:` (NIP-21). */
export function parseEventRef(input: string): EventRefResult {
  const value = cleanInput(input);

  if (HEX_ID.test(value)) {
    return { ok: true, ref: { id: value, relays: [] } };
  }

  let decoded: nip19.DecodedResult;
  try {
    decoded = nip19.decode(value);
  } catch {
    return { ok: false, error: 'invalid' };
  }

  switch (decoded.type) {
    case 'note':
      return { ok: true, ref: { id: decoded.data, relays: [] } };
    case 'nevent': {
      const { id, relays, author, kind } = decoded.data;
      return {
        ok: true,
        ref: {
          id,
          relays: cleanRelays(relays),
          ...(author ? { author } : {}),
          ...(kind !== undefined ? { kind } : {}),
        },
      };
    }
    default:
      return { ok: false, error: 'unsupported', type: decoded.type };
  }
}

/** Parses an address reference: naddr1…, optionally prefixed with `nostr:` (NIP-21). */
export function parseAddressRef(input: string): AddressRefResult {
  let decoded: nip19.DecodedResult;
  try {
    decoded = nip19.decode(cleanInput(input));
  } catch {
    return { ok: false, error: 'invalid' };
  }

  if (decoded.type !== 'naddr') {
    return { ok: false, error: 'unsupported', type: decoded.type };
  }

  const { kind, pubkey, identifier, relays } = decoded.data;
  return { ok: true, ref: { kind, author: pubkey, identifier, relays: cleanRelays(relays) } };
}
