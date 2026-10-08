import { describe, it, expect } from 'vitest';
import { RANDOM_QUERIES, RANDOM_RELAYS, pickRandomQuery } from './presets';

/** A random() that returns the given values in order, then repeats the last one. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('pickRandomQuery', () => {
  it('never repeats the previous kind', () => {
    for (let i = 0; i < 200; i++) {
      expect(pickRandomQuery('1').kind).not.toBe('1');
    }
  });

  it('picks two different free relays', () => {
    for (let i = 0; i < 200; i++) {
      const q = pickRandomQuery('38383');
      expect(q.relays).toHaveLength(2);
      expect(new Set(q.relays).size).toBe(2);
      q.relays.forEach(r => expect(RANDOM_RELAYS).toContain(r));
    }
  });

  it('adds a topic tag only for kinds that have topics', () => {
    expect(pickRandomQuery(undefined, sequence(0, 0.1, 0))).toMatchObject({ kind: '1', tag: 't:bitcoin' });
    expect(pickRandomQuery(undefined, sequence(0, 0.9, 0)).tag).toBe('');
    const reactions = RANDOM_QUERIES.findIndex(q => q.kind === '7') / RANDOM_QUERIES.length;
    expect(pickRandomQuery(undefined, sequence(reactions, 0.1, 0)).tag).toBe('');
  });

  it('uses the Mostro relay for Mostro orders', () => {
    const mostro = (RANDOM_QUERIES.findIndex(q => q.kind === '38383') + 0.5) / RANDOM_QUERIES.length;
    expect(pickRandomQuery(undefined, sequence(mostro))).toEqual({
      kind: '38383', tag: '', relays: ['relay.mostro.network'],
    });
  });
});
