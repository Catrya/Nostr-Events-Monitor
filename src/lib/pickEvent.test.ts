// @vitest-environment node
// In jsdom, TextEncoder returns a Uint8Array from another realm that @noble/hashes rejects
import { describe, it, expect } from 'vitest';
import { finalizeEvent, generateSecretKey } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { pickEvent } from './pickEvent';

const sk = generateSecretKey();

function version(created_at: number, status: string): NostrEvent {
  return finalizeEvent({ kind: 38383, created_at, tags: [['d', 'order-1'], ['s', status]], content: '' }, sk);
}

function forged(event: NostrEvent): NostrEvent {
  return { ...event, sig: finalizeEvent({ kind: 1, created_at: 0, tags: [], content: '' }, generateSecretKey()).sig };
}

const pending = version(1000, 'pending');
const success = version(2000, 'success');

describe('pickEvent', () => {
  it('returns nothing when no relay has the event', () => {
    expect(pickEvent([undefined, undefined], {}, 'latest')).toEqual({ best: undefined, statuses: [undefined, undefined] });
  });

  it('picks the newest version and marks older copies as outdated', () => {
    const { best, statuses } = pickEvent([pending, undefined, success], { identifier: 'order-1' }, 'latest');

    expect(best?.event.id).toBe(success.id);
    expect(best?.verification).toEqual({ idValid: true, signatureValid: true, identifierMatches: true });
    expect(statuses).toEqual(['outdated', undefined, 'found']);
  });

  it('never picks an invalid copy, even if it is newer', () => {
    const fakeNewer = forged(version(3000, 'canceled'));
    const { best, statuses } = pickEvent([fakeNewer, pending], {}, 'latest');

    expect(best?.event.id).toBe(pending.id);
    expect(statuses).toEqual(['invalid', 'found']);
  });

  it('breaks ties on created_at by the lowest id', () => {
    const a = version(5000, 'a');
    const b = version(5000, 'b');
    const [low, high] = a.id < b.id ? [a, b] : [b, a];

    expect(pickEvent([high, low], {}, 'latest').best?.event.id).toBe(low.id);
  });

  it('in first mode keeps relay order and prefers a valid copy', () => {
    const fake = forged(pending);
    const { best, statuses } = pickEvent([fake, pending, pending], {}, 'first');

    expect(best?.event).toBe(pending);
    expect(statuses).toEqual(['invalid', 'found', 'found']);
  });

  it('falls back to an invalid copy when it is all there is', () => {
    const fake = forged(pending);
    const { best, statuses } = pickEvent([fake], {}, 'first');

    expect(best?.event).toBe(fake);
    expect(best?.verification.signatureValid).toBe(false);
    expect(statuses).toEqual(['invalid']);
  });
});
