import { describe, it, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { addressPath, eventAddress, eventPath, identifierOf, isVersioned } from './eventLinks';

const AUTHOR = '00000235a3e904cfe1213a8a54d6f1ec1bef7cc6bfaabd6193e82931ccf1366a';
const RELAYS = ['wss://relay.mostro.network', 'wss://nos.lol', 'wss://relay.damus.io', 'wss://relay.primal.net'];

function ev(kind: number, tags: string[][] = []): NostrEvent {
  return { id: 'a'.repeat(64), pubkey: AUTHOR, created_at: 1700000000, kind, tags, content: '', sig: 'b'.repeat(128) };
}

const decode = (path: string) => nip19.decode(path.slice(3));

describe('isVersioned', () => {
  it('is true for addressable and replaceable kinds only', () => {
    expect([0, 3, 10002, 30023, 38383].map(isVersioned)).toEqual([true, true, true, true, true]);
    expect([1, 7, 9735, 20000].map(isVersioned)).toEqual([false, false, false, false]);
  });
});

describe('identifierOf / eventAddress', () => {
  it('reads the d tag of addressable events', () => {
    const order = ev(38383, [['d', 'order-1'], ['s', 'pending']]);

    expect(identifierOf(order)).toBe('order-1');
    expect(eventAddress(order)).toBe(`38383:${AUTHOR}:order-1`);
  });

  it('uses an empty d for replaceable kinds and none for regular ones', () => {
    expect(eventAddress(ev(10002, [['d', 'ignored']]))).toBe(`10002:${AUTHOR}:`);
    expect(eventAddress(ev(1))).toBeUndefined();
  });
});

describe('eventPath', () => {
  it('links the exact event with at most 3 relays', () => {
    const path = eventPath(ev(1), RELAYS);

    expect(path).toMatch(/^\/e\/nevent1/);
    expect(decode(path)).toEqual({ type: 'nevent', data: { id: 'a'.repeat(64), author: AUTHOR, kind: 1, relays: RELAYS.slice(0, 3) } });
  });

  it('works without relays', () => {
    expect(decode(eventPath(ev(1)))).toMatchObject({ type: 'nevent', data: { relays: [] } });
  });
});

describe('addressPath', () => {
  it('links the latest version of the address', () => {
    const path = addressPath(ev(38383, [['d', 'order-1']]), RELAYS);

    expect(path).toMatch(/^\/a\/naddr1/);
    expect(decode(path)).toEqual({ type: 'naddr', data: { kind: 38383, pubkey: AUTHOR, identifier: 'order-1', relays: RELAYS.slice(0, 3) } });
  });

  it('uses an empty identifier for replaceable kinds', () => {
    expect(decode(addressPath(ev(10002)))).toMatchObject({ type: 'naddr', data: { kind: 10002, identifier: '' } });
  });
});
