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

export type EventRefResult =
  | { ok: true; ref: EventRef }
  /** `unsupported` is a valid NIP-19 entity that does not point to a single event by id (e.g. naddr, npub). */
  | { ok: false; error: 'invalid' }
  | { ok: false; error: 'unsupported'; type: string };

const HEX_ID = /^[0-9a-f]{64}$/;

/** Parses an event reference: nevent1…, note1…, a 64-char hex id, optionally prefixed with `nostr:` (NIP-21). */
export function parseEventRef(input: string): EventRefResult {
  const value = input.trim().replace(/^nostr:/i, '').toLowerCase();

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
      const { id, relays = [], author, kind } = decoded.data;
      return {
        ok: true,
        ref: {
          id,
          relays: [...new Set(relays.filter(isValidWebSocketUrl).map(normalizeRelayUrl))],
          ...(author ? { author } : {}),
          ...(kind !== undefined ? { kind } : {}),
        },
      };
    }
    default:
      return { ok: false, error: 'unsupported', type: decoded.type };
  }
}
