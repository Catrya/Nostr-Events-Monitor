export const SUGGESTED_RELAYS: string[] = [
  'relay.damus.io',
  'relay.primal.net',
  'nos.lol',
  'relay.nostr.band',
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
