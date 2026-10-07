import { describe, it, expect } from 'vitest';
import { getNipInfo } from './kindInfo';

describe('getNipInfo', () => {
  it('knows NIPs added to the official list', () => {
    expect(getNipInfo('CC')).toMatchObject({ name: 'Geocaching', link: 'https://github.com/nostr-protocol/nips/blob/master/CC.md' });
    expect(getNipInfo('f4')?.name).toBe('Podcasts');
    expect(getNipInfo('NIP-67')?.name).toBe('EOSE Completeness Hint');
    expect(getNipInfo('8')?.name).toBe('Handling Mentions');
  });

  it('uses the current official names', () => {
    expect(getNipInfo('39')?.name).toBe('Linking Profiles to Other Platforms');
    expect(getNipInfo('5A')?.name).toBe('Static Websites (nsites)');
  });

  it('returns null for unknown NIPs', () => {
    expect(getNipInfo('ZZ')).toBeNull();
  });
});
