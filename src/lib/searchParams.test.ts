import { describe, it, expect } from 'vitest';
import { parseTagFilter } from './searchParams';

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
