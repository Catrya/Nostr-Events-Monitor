import { describe, it, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
import { parseEventRef } from './eventRef';

const ID = '7287ca0d61a697ebe107ade2085ad4f41640f8b844bd79f455a743e8ceb0c1f2';
const AUTHOR = '00000235a3e904cfe1213a8a54d6f1ec1bef7cc6bfaabd6193e82931ccf1366a';

describe('parseEventRef', () => {
  it('parses a nevent with relays, author and kind', () => {
    // Real Mostro order linked from tasaK
    const nevent = 'nevent1qvzqqqy4aupzqqqqqg6686gyelsjzw522nt0rmqmaa7vd0a2h4se86pfx8x0zdn2qyd8wumn8ghj7un9d3shjtnddaehgun09ehx2arhdaexkqgdwaehxw309ahx7uewd3hkcqpqw2ru5rtp56t7hcg84h3qskk57styp79cgj7hnaz45ap73n4sc8eqqz3pyq';

    expect(parseEventRef(nevent)).toEqual({
      ok: true,
      ref: {
        id: ID,
        relays: ['wss://relay.mostro.network', 'wss://nos.lol'],
        author: AUTHOR,
        kind: 38383,
      },
    });
  });

  it('parses a nevent without optional fields', () => {
    expect(parseEventRef(nip19.neventEncode({ id: ID }))).toEqual({ ok: true, ref: { id: ID, relays: [] } });
  });

  it('drops invalid relay hints and deduplicates the rest', () => {
    const nevent = nip19.neventEncode({ id: ID, relays: ['wss://nos.lol', 'https://example.com', 'wss://nos.lol', ''] });

    expect(parseEventRef(nevent)).toEqual({ ok: true, ref: { id: ID, relays: ['wss://nos.lol'] } });
  });

  it('parses a note', () => {
    expect(parseEventRef(nip19.noteEncode(ID))).toEqual({ ok: true, ref: { id: ID, relays: [] } });
  });

  it('parses a hex id, in any case', () => {
    expect(parseEventRef(ID)).toEqual({ ok: true, ref: { id: ID, relays: [] } });
    expect(parseEventRef(ID.toUpperCase())).toEqual({ ok: true, ref: { id: ID, relays: [] } });
  });

  it('accepts the nostr: prefix and surrounding whitespace', () => {
    expect(parseEventRef(`  nostr:${nip19.noteEncode(ID)} `)).toEqual({ ok: true, ref: { id: ID, relays: [] } });
  });

  it('reports NIP-19 entities that are not an event id as unsupported', () => {
    const naddr = nip19.naddrEncode({ kind: 38383, pubkey: AUTHOR, identifier: 'order' });

    expect(parseEventRef(naddr)).toEqual({ ok: false, error: 'unsupported', type: 'naddr' });
    expect(parseEventRef(nip19.npubEncode(AUTHOR))).toEqual({ ok: false, error: 'unsupported', type: 'npub' });
  });

  it('rejects anything else', () => {
    for (const input of ['', 'hello', ID.slice(1), 'nevent1invalid', `${ID}0`]) {
      expect(parseEventRef(input)).toEqual({ ok: false, error: 'invalid' });
    }
  });
});
