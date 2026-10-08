export const SUGGESTED_RELAYS: string[] = [
  'relay.damus.io',
  'relay.primal.net',
  'nos.lol',
  'relay.mostro.network',
];

export interface QueryPreset {
  id: string;
  title: string;
  desc: string;
  kind: string;
}

export const PRESETS: QueryPreset[] = [
  { id: 'notes', title: 'Recent notes', desc: 'kind:1 · short text notes', kind: '1' },
  { id: 'mostro', title: 'Mostro P2P orders', desc: 'kind:38383 · NIP-69', kind: '38383' },
  { id: 'zaps', title: 'Zap receipts', desc: 'kind:9735 · NIP-57', kind: '9735' },
  { id: 'profiles', title: 'User metadata', desc: 'kind:0 · profile updates', kind: '0' },
];

// Free relays that answered for every kind below when tested (2026-10-08)
export const RANDOM_RELAYS: string[] = [
  'relay.damus.io',
  'nos.lol',
  'relay.primal.net',
  'relay.nostr.net',
  'nostr.mom',
  'nostr.bitcoiner.social',
  'nostr.oxtr.dev',
  'offchain.pub',
  'nostr-pub.wellorder.net',
];

export interface RandomQueryOption {
  kind: string;
  /** Topic hashtags; one is sometimes added as a t: tag */
  topics?: string[];
  /** Relay to use instead of a random one, for kinds that only live there */
  relay?: string;
}

// Public content only: no authors, no p:/e: tags and no kinds about one person (profiles, contacts, DMs)
export const RANDOM_QUERIES: RandomQueryOption[] = [
  { kind: '1', topics: ['bitcoin', 'nostr', 'photography', 'music', 'art'] },
  { kind: '6' },
  { kind: '7' },
  { kind: '20' },
  { kind: '1063' },
  { kind: '9735' },
  { kind: '9802' },
  { kind: '30023', topics: ['bitcoin', 'nostr'] },
  { kind: '30311' },
  { kind: '30402' },
  { kind: '31923' },
  { kind: '38383', relay: 'relay.mostro.network' },
  { kind: '39089' },
];

export interface RandomQuery {
  kind: string;
  tag: string;
  /** Relays to add when the form has none (or the kind needs its own) */
  relays: string[];
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/** A random query that is known to return events; `previousKind` is not repeated. */
export function pickRandomQuery(previousKind?: string, random: () => number = Math.random): RandomQuery {
  const options = RANDOM_QUERIES.filter(q => q.kind !== previousKind);
  const option = pick(options, random);
  const tag = option.topics && random() < 0.5 ? `t:${pick(option.topics, random)}` : '';
  if (option.relay) return { kind: option.kind, tag, relays: [option.relay] };
  const first = pick(RANDOM_RELAYS, random);
  const second = pick(RANDOM_RELAYS.filter(r => r !== first), random);
  return { kind: option.kind, tag, relays: [first, second] };
}
