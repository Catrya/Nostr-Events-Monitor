import { describe, it, expect } from 'vitest';
import { getKindInfo, getKindsForNip, getNipInfo } from './kindInfo';

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

describe('getKindInfo', () => {
  it('knows kinds added to the official list', () => {
    expect(getKindInfo(54)).toMatchObject({ nip: 'NIP-F4', description: 'Podcast Episode' });
    expect(getKindInfo(21059)).toMatchObject({ nip: 'NIP-59', description: 'Ephemeral Gift Wrap', classification: 'ephemeral' });
    expect(getKindInfo(38000)).toMatchObject({ nip: 'NIP-87', classification: 'addressable' });
  });

  it('links kinds whose spec became an official NIP', () => {
    expect(getKindInfo(37516)).toMatchObject({ nip: 'NIP-CC', link: 'https://github.com/nostr-protocol/nips/blob/master/CC.md' });
    expect(getKindInfo(24242)).toMatchObject({ nip: 'NIP-B7', link: 'https://github.com/nostr-protocol/nips/blob/master/B7.md' });
  });
});

describe('getKindsForNip', () => {
  it('finds the kinds of a new NIP', () => {
    expect(getKindsForNip('CC')).toEqual([7516, 7517, 37516, 37517]);
    expect(getKindsForNip('F4')).toEqual([54, 10154]);
  });
});
