import type { NostrEvent } from '@nostrify/nostrify';
import { getEventHash, validateEvent, verifyEvent } from 'nostr-tools';
import type { EventRef } from '@/lib/eventRef';

export interface EventVerification {
  /** The id is the hash of the event content: the content was not altered. */
  idValid: boolean;
  /** The signature matches the pubkey. Always false when the id is not valid. */
  signatureValid: boolean;
  /** Whether the event matches the author/kind of the reference; undefined when the reference has none. */
  authorMatches?: boolean;
  kindMatches?: boolean;
}

export function checkEvent(event: NostrEvent, ref?: Pick<EventRef, 'author' | 'kind'>): EventVerification {
  // Fresh copy: nostr-tools caches the verification result on the event object
  const { id, pubkey, created_at, kind, tags, content, sig } = event;
  const copy = { id, pubkey, created_at, kind, tags, content, sig };

  let idValid = false;
  let signatureValid = false;
  if (validateEvent(copy)) {
    try {
      idValid = getEventHash(copy) === id;
      signatureValid = idValid && verifyEvent(copy);
    } catch {
      // Malformed hex in id/pubkey/sig: both stay false
    }
  }

  return {
    idValid,
    signatureValid,
    ...(ref?.author ? { authorMatches: ref.author === pubkey } : {}),
    ...(ref?.kind !== undefined ? { kindMatches: ref.kind === kind } : {}),
  };
}
