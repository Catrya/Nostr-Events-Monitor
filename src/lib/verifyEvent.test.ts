// @vitest-environment node
// In jsdom, TextEncoder returns a Uint8Array from another realm that @noble/hashes rejects
import { describe, it, expect } from 'vitest';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { checkEvent } from './verifyEvent';

function signedEvent(): NostrEvent {
  return finalizeEvent(
    { kind: 1, created_at: 1700000000, tags: [['t', 'test']], content: 'hello' },
    generateSecretKey(),
  );
}

describe('checkEvent', () => {
  it('accepts a correctly signed event', () => {
    expect(checkEvent(signedEvent())).toEqual({ idValid: true, signatureValid: true });
  });

  it('detects altered content', () => {
    const event = { ...signedEvent(), content: 'altered' };

    expect(checkEvent(event)).toEqual({ idValid: false, signatureValid: false });
  });

  it('detects a signature from another key', () => {
    const event = { ...signedEvent(), sig: signedEvent().sig };

    expect(checkEvent(event)).toEqual({ idValid: true, signatureValid: false });
  });

  it('does not reuse a cached verification result', () => {
    const event = signedEvent();
    expect(checkEvent(event).signatureValid).toBe(true);

    event.sig = signedEvent().sig;

    expect(checkEvent(event).signatureValid).toBe(false);
  });

  it('rejects a malformed event', () => {
    const event = { ...signedEvent(), pubkey: 'not-hex' };

    expect(checkEvent(event)).toEqual({ idValid: false, signatureValid: false });
  });

  it('compares author and kind with the reference', () => {
    const event = signedEvent();
    const other = getPublicKey(generateSecretKey());

    expect(checkEvent(event, { author: event.pubkey, kind: 1 })).toMatchObject({ authorMatches: true, kindMatches: true });
    expect(checkEvent(event, { author: other, kind: 7 })).toMatchObject({ authorMatches: false, kindMatches: false });
    expect(checkEvent(event, {})).not.toHaveProperty('authorMatches');
  });

  it('compares the d tag with the reference', () => {
    const sk = generateSecretKey();
    const event = finalizeEvent({ kind: 38383, created_at: 1700000000, tags: [['d', 'order-1']], content: '' }, sk);
    const noD = finalizeEvent({ kind: 10002, created_at: 1700000000, tags: [], content: '' }, sk);

    expect(checkEvent(event, { identifier: 'order-1' }).identifierMatches).toBe(true);
    expect(checkEvent(event, { identifier: 'order-2' }).identifierMatches).toBe(false);
    expect(checkEvent(noD, { identifier: '' }).identifierMatches).toBe(true);
    expect(checkEvent(event)).not.toHaveProperty('identifierMatches');
  });

  it('does not crash on malformed tags', () => {
    const event = { ...signedEvent(), tags: 'not-an-array' } as unknown as NostrEvent;

    expect(checkEvent(event, { identifier: 'x' })).toEqual({ idValid: false, signatureValid: false, identifierMatches: false });
  });
});
