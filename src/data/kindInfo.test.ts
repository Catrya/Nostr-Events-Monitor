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

describe('kinds from the kinds registry', () => {
  const REGISTRY = 'https://github.com/nostr-protocol/registry-of-kinds/blob/master/schema.yaml';

  it('describes kinds that have no NIP, linking to the registry', () => {
    expect(getKindInfo(25050)).toMatchObject({ nip: '', description: 'Call Offer', link: REGISTRY, classification: 'ephemeral' });
    expect(getKindInfo(1064)).toMatchObject({ nip: '', description: 'Blob Data (NIP-95)', link: REGISTRY });
  });

  it('links a registry kind to its NIP or spec when the registry names one', () => {
    expect(getKindInfo(30385)).toMatchObject({ nip: 'NIP-85', description: 'External ID Assertion' });
    expect(getKindInfo(36820)).toMatchObject({ nip: 'Hitchhiking Data Standard', description: 'Hitchhiking Ride', link: 'https://github.com/Hitchwiki/hitchhiking-data-standard' });
  });
});

describe('getKindsForNip', () => {
  it('finds the kinds of a new NIP', () => {
    expect(getKindsForNip('CC')).toEqual([7516, 7517, 37516, 37517]);
    expect(getKindsForNip('F4')).toEqual([54, 10154]);
  });
});
