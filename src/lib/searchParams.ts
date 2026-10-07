import { nip19 } from 'nostr-tools';
import { normalizeRelayUrl, isValidWebSocketUrl } from '@/lib/relays';

/** A `name:value` tag filter as typed in the form. Splits on the first colon only: values can contain colons (URLs, `a` tag addresses). */
export function parseTagFilter(tag: string): [name: string, value: string] | null {
  const i = tag.indexOf(':');
  if (i < 0) return null;
  const name = tag.slice(0, i).trim();
  const value = tag.slice(i + 1).trim();
  return name && value ? [name, value] : null;
}

/** The monitor form, as far as a shared link can describe it. */
export interface SearchForm {
  relays: string[];
  kinds: string[];
  nips: string[];
  authors: string[];
  tags: string[];
  since: string;
  until: string;
  limit: string;
  mode: 'search' | 'stream';
  queryType: 'kind' | 'nip';
}

const SEARCH_KEYS = ['relays', 'kinds', 'nips', 'authors', 'tag', 'since', 'until', 'limit', 'mode'];

const KIND = /^\d{1,5}$/;
const NIP = /^[0-9a-z]{1,3}$/i;
const TIMESTAMP = /^\d{1,12}$/;
const HEX_PUBKEY = /^[0-9a-f]{64}$/i;

function isAuthor(value: string): boolean {
  if (HEX_PUBKEY.test(value)) return true;
  try {
    return nip19.decode(value).type === 'npub';
  } catch {
    return false;
  }
}

const filled = (values: string[]) => values.map(v => v.trim()).filter(Boolean);
const list = (value: string | null) => filled((value ?? '').split(','));

// Commas, colons and slashes are valid in a query string: keeping them makes the link readable
const encode = (value: string) => encodeURIComponent(value).replace(/%2C/g, ',').replace(/%3A/g, ':').replace(/%2F/g, '/');

/** Query string (without `?`) for a form; empty and invalid fields are left out. */
export function searchToQuery(form: SearchForm): string {
  const pairs: [string, string][] = [];
  const add = (key: string, values: string[]) => { if (values.length) pairs.push([key, values.join(',')]); };

  add('relays', filled(form.relays).filter(isValidWebSocketUrl).map(r => normalizeRelayUrl(r).replace(/^wss:\/\//, '')));
  if (form.queryType === 'nip') add('nips', filled(form.nips).filter(n => NIP.test(n)));
  else add('kinds', filled(form.kinds).filter(k => KIND.test(k)));
  add('authors', filled(form.authors).filter(isAuthor));
  for (const tag of form.tags) {
    const parsed = parseTagFilter(tag);
    if (parsed) pairs.push(['tag', parsed.join(':')]);
  }
  if (TIMESTAMP.test(form.since)) pairs.push(['since', form.since]);
  if (TIMESTAMP.test(form.until)) pairs.push(['until', form.until]);
  if (/^\d+$/.test(form.limit) && Number(form.limit) > 0) pairs.push(['limit', form.limit]);
  if (form.mode === 'stream') pairs.push(['mode', 'stream']);

  return pairs.map(([k, v]) => `${k}=${encode(v)}`).join('&');
}

/** The form fields a query string sets, skipping invalid values; null when it has no search parameters. */
export function queryToSearch(query: string): Partial<SearchForm> | null {
  const params = new URLSearchParams(query);
  if (!SEARCH_KEYS.some(k => params.has(k))) return null;

  const form: Partial<SearchForm> = {};
  const relays = list(params.get('relays')).filter(isValidWebSocketUrl).map(normalizeRelayUrl);
  if (relays.length) form.relays = [...new Set(relays)];
  const nips = list(params.get('nips')).filter(n => NIP.test(n));
  const kinds = list(params.get('kinds')).filter(k => KIND.test(k));
  if (nips.length) {
    form.nips = nips;
    form.queryType = 'nip';
  } else if (kinds.length) {
    form.kinds = kinds;
  }
  const authors = list(params.get('authors')).filter(isAuthor);
  if (authors.length) form.authors = authors;
  const tags = params.getAll('tag').map(parseTagFilter).filter(t => t !== null).map(t => t.join(':'));
  if (tags.length) form.tags = tags;
  for (const key of ['since', 'until'] as const) {
    const value = params.get(key)?.trim() ?? '';
    if (TIMESTAMP.test(value)) form[key] = value;
  }
  const limit = params.get('limit')?.trim() ?? '';
  if (/^\d+$/.test(limit) && Number(limit) > 0) form.limit = limit;
  if (params.get('mode') === 'stream') form.mode = 'stream';

  return form;
}
