import { describe, it, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
import { parseTagFilter, queryToSearch, searchToQuery, type SearchForm } from './searchParams';

describe('parseTagFilter', () => {
  it('splits name and value', () => {
    expect(parseTagFilter('s:pending')).toEqual(['s', 'pending']);
    expect(parseTagFilter(' t : bitcoin ')).toEqual(['t', 'bitcoin']);
  });

  it('keeps colons in the value', () => {
    expect(parseTagFilter('r:wss://relay.damus.io')).toEqual(['r', 'wss://relay.damus.io']);
    expect(parseTagFilter('a:38383:abc:order-1')).toEqual(['a', '38383:abc:order-1']);
  });

  it('rejects a missing name, value or colon', () => {
    for (const tag of ['pending', ':pending', 's:', 's:  ', '']) {
      expect(parseTagFilter(tag)).toBeNull();
    }
  });
});

const NODE = '00000235a3e904cfe1213a8a54d6f1ec1bef7cc6bfaabd6193e82931ccf1366a';
const NPUB = nip19.npubEncode(NODE);

const empty: SearchForm = {
  relays: [''], kinds: [''], nips: [''], authors: [''], tags: [''],
  since: '', until: '', limit: '', mode: 'search', queryType: 'kind',
};

describe('searchToQuery', () => {
  it('writes a readable query with only the filled fields', () => {
    const query = searchToQuery({
      ...empty,
      relays: ['relay.mostro.network', 'wss://nos.lol', ''],
      kinds: ['38383'],
      authors: [NPUB],
      tags: ['s:pending', 'f:CUP', ''],
      limit: '20',
    });

    expect(query).toBe(`relays=relay.mostro.network,nos.lol&kinds=38383&authors=${NPUB}&tag=s:pending&tag=f:CUP&limit=20`);
  });

  it('is empty for an empty form', () => {
    expect(searchToQuery(empty)).toBe('');
  });

  it('keeps ws:// relays, the time range and the stream mode', () => {
    expect(searchToQuery({ ...empty, relays: ['ws://localhost:7777'], since: '1700000000', until: '1700086400', mode: 'stream' }))
      .toBe('relays=ws://localhost:7777&since=1700000000&until=1700086400&mode=stream');
  });

  it('writes the NIPs instead of the kinds in NIP mode', () => {
    expect(searchToQuery({ ...empty, queryType: 'nip', nips: ['69'], kinds: ['1'] })).toBe('nips=69');
  });

  it('leaves out invalid values', () => {
    expect(searchToQuery({
      ...empty,
      relays: ['https://example.com', 'nos.lol'],
      kinds: ['abc', '1'],
      authors: ['npub1broken', NODE],
      tags: ['nocolon'],
      since: 'yesterday',
      limit: '0',
    })).toBe(`relays=nos.lol&kinds=1&authors=${NODE}`);
  });

  it('encodes characters that would break the query', () => {
    const query = searchToQuery({ ...empty, tags: ['t:a&b=c #d+e'] });

    expect(query).toBe('tag=t:a%26b%3Dc%20%23d%2Be');
    expect(queryToSearch(query)?.tags).toEqual(['t:a&b=c #d+e']);
  });
});

describe('queryToSearch', () => {
  it('returns null without search parameters', () => {
    expect(queryToSearch('')).toBeNull();
    expect(queryToSearch('?utm_source=x')).toBeNull();
  });

  it('reads every field', () => {
    expect(queryToSearch(`?relays=relay.mostro.network,nos.lol&kinds=38383,1&authors=${NPUB}&tag=s:pending&tag=r:wss://relay.damus.io&since=1700000000&until=1700086400&limit=20&mode=stream`))
      .toEqual({
        relays: ['wss://relay.mostro.network', 'wss://nos.lol'],
        kinds: ['38383', '1'],
        authors: [NPUB],
        tags: ['s:pending', 'r:wss://relay.damus.io'],
        since: '1700000000',
        until: '1700086400',
        limit: '20',
        mode: 'stream',
      });
  });

  it('switches to NIP mode when NIPs are given, ignoring kinds', () => {
    expect(queryToSearch('nips=69,01&kinds=1')).toEqual({ nips: ['69', '01'], queryType: 'nip' });
  });

  it('skips invalid values and keeps the rest', () => {
    expect(queryToSearch('relays=https://example.com,nos.lol,nos.lol&kinds=abc,7&authors=npub1broken&tag=nocolon&since=soon&limit=-5&mode=fast'))
      .toEqual({ relays: ['wss://nos.lol'], kinds: ['7'] });
  });

  it('accepts its own output, also with percent-encoded commas and colons', () => {
    const form = { ...empty, relays: ['wss://nos.lol', 'wss://relay.damus.io'], kinds: ['1', '7'], tags: ['a:38383:abc:order-1'] };

    expect(queryToSearch(searchToQuery(form))).toEqual({ relays: form.relays, kinds: form.kinds, tags: form.tags });
    expect(queryToSearch('relays=nos.lol%2Crelay.damus.io&tag=s%3Apending')).toEqual({ relays: ['wss://nos.lol', 'wss://relay.damus.io'], tags: ['s:pending'] });
  });
});
