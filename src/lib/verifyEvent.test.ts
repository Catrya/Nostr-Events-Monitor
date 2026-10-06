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
});
