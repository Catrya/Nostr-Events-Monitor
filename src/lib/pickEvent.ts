import type { NostrEvent } from '@nostrify/nostrify';
import { checkEvent, type EventVerification, type RefExpectations } from '@/lib/verifyEvent';

/**
 * - `first`: lookup by id; any valid copy will do, in relay order.
 * - `latest`: lookup by address; the newest valid version wins (ties: lowest id, as in NIP-01).
 */
export type PickMode = 'first' | 'latest';

/** How the event a relay returned compares to the chosen one. */
export type CopyStatus = 'found' | 'outdated' | 'invalid';

export interface PickResult {
  best?: { event: NostrEvent; verification: EventVerification };
  /** One entry per input; undefined where the relay returned nothing. */
  statuses: (CopyStatus | undefined)[];
}

/** Whether `a` replaces `b` as a version of the same address: newer, or same time and lower id (NIP-01). */
export function isNewer(a: NostrEvent, b: NostrEvent): boolean {
  return a.created_at !== b.created_at ? a.created_at > b.created_at : a.id < b.id;
}

/** Chooses the event to show from what each relay returned, and how each relay's copy compares to it. */
export function pickEvent(events: (NostrEvent | undefined)[], expectations: RefExpectations, mode: PickMode): PickResult {
  const checked = events.map(event => event && { event, verification: checkEvent(event, expectations) });
  const present = checked.filter(c => c !== undefined);
  const valid = present.filter(c => c.verification.signatureValid);
  // Never prefer an invalid copy over a valid one, however new it claims to be
  const pool = valid.length > 0 ? valid : present;

  const best = mode === 'first'
    ? pool[0]
    : pool.reduce<typeof pool[number] | undefined>((acc, c) => (!acc || isNewer(c.event, acc.event) ? c : acc), undefined);

  return {
    best,
    statuses: checked.map(c => {
      if (!c) return undefined;
      if (!c.verification.signatureValid) return 'invalid';
      return c.event.id === best?.event.id ? 'found' : 'outdated';
    }),
  };
}
