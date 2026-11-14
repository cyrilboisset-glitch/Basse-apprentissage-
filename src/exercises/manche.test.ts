import { describe, it, expect } from 'vitest';
import { makeRound, applyNote, newState, zoneMastered, unlockedZones, heatStatus, type Ctx, type DrillKind } from './manche';
import { updateItem, emptyItem, weight, pickWeighted, DAY } from '../storage/srs';
import { pc } from '../theory/scales';

let seed = 1; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ctx = (from: number, to: number): Ctx => ({ tuning: [28, 33, 38, 43], frets: 24, zone: { from, to }, notation: 'fr', srs: new Map(), rng });

describe('génération des manches', () => {
  const kinds: DrillKind[] = ['hunt', 'string', 'quiz', 'interval', 'scale', 'arpeggio'];
  for (const k of kinds) it(`${k} : toujours jouable dans chaque zone`, () => {
    for (const [f, t] of [[0, 5], [5, 9], [9, 12], [12, 17], [0, 24]]) for (let i = 0; i < 40; i++) {
      const r = makeRound(k, ctx(f, t));
      expect(r.targets.length).toBeGreaterThan(0);
      expect(r.prompt.length).toBeGreaterThan(5);
      if (k === 'hunt') expect(new Set(r.targets.map(pc)).size).toBe(1);
      if (k === 'scale' || k === 'arpeggio') expect(r.targets.length).toBeGreaterThanOrEqual(3);
      if (k === 'scale') expect([...r.targets]).toEqual([...r.targets].sort((a, b) => a - b));
    }
  });
  it('gammes : une partie des manches relie deux positions voisines (plus de notes, toujours croissant)', () => {
    let linked = 0, single = 0; const sizes: number[] = [];
    for (let i = 0; i < 200; i++) { const r = makeRound('scale', ctx(0, 12)); if (/reliez/.test(r.prompt)) { linked++; sizes.push(r.targets.length); expect(r.targets).toEqual([...r.targets].sort((a, b) => a - b)); } else single++; }
    expect(linked).toBeGreaterThan(20); expect(single).toBeGreaterThan(20); expect(Math.max(...sizes)).toBeGreaterThan(7);
  });
  it('hunt : cases 0-5 de Mi = Mi grave à vide, La case 7 hors zone', () => {
    const r = makeRound('hunt', { ...ctx(0, 5), rng: () => 0 }); // 1re classe de hauteur de la zone
    expect(r.targets.every(m => m >= 28 && m <= 48)).toBe(true);
  });
});
describe('évaluation', () => {
  it('séquence ordonnée : bonnes et mauvaises notes, répétition ignorée', () => {
    const r = { kind: 'scale', prompt: '', targets: [40, 42, 44], ordered: true, show: [] } as any; const st = newState();
    expect(applyNote(r, st, 40)).toBe('ok'); expect(applyNote(r, st, 40)).toBe('ignored');
    expect(applyNote(r, st, 45)).toBe('wrong'); expect(applyNote(r, st, 42)).toBe('ok'); expect(applyNote(r, st, 44)).toBe('ok');
    expect(st.done).toBe(true); expect([st.correct, st.wrong]).toEqual([3, 1]);
  });
  it('chasse : ordre libre, doublon ignoré, fini quand tout est trouvé', () => {
    const r = { kind: 'hunt', prompt: '', targets: [28, 40], ordered: false, show: [] } as any; const st = newState();
    applyNote(r, st, 40); expect(applyNote(r, st, 40)).toBe('ignored'); applyNote(r, st, 28); expect(st.done).toBe(true);
  });
  it('« any » : une seule des octaves suffit', () => {
    const r = { kind: 'string', prompt: '', targets: [35, 47], ordered: false, any: true, show: [] } as any; const st = newState();
    applyNote(r, st, 47); expect(st.done).toBe(true);
  });
});
describe('déblocage et carte de chaleur', () => {
  const d = (zone: string, accuracy: number) => ({ zone, accuracy, date: '' });
  it('zone suivante à 90 % sur 3 séances', () => {
    expect(unlockedZones([d('z0', .95), d('z0', .9)])).toEqual(['z0']);
    expect(unlockedZones([d('z0', .95), d('z0', .9), d('z0', .91)])).toEqual(['z0', 'z1']);
    expect(zoneMastered([d('z0', .5), d('z0', .95), d('z0', .9), d('z0', .91)], 'z0')).toBe(true); // 3 dernières
    expect(zoneMastered([d('z0', .95), d('z0', .8), d('z0', .8)], 'z0')).toBe(false);
  });
  it('tout débloquer', () => expect(unlockedZones([], true).length).toBe(5));
  it('statuts de la carte', () => {
    expect(heatStatus(undefined)).toBe('unseen');
    expect(heatStatus({ midi: 1, ok: 9, miss: 1, n: 9, totalMs: 9000, last: 0 })).toBe('ok');
    expect(heatStatus({ midi: 1, ok: 9, miss: 1, n: 9, totalMs: 40000, last: 0 })).toBe('slow');
    expect(heatStatus({ midi: 1, ok: 3, miss: 7, n: 3, totalMs: 3000, last: 0 })).toBe('bad');
  });
});
describe('répétition espacée', () => {
  const now = 1e12;
  it('réussite : boîte +1, échéance repoussée ; échec : retour boîte 0', () => {
    let it = updateItem(emptyItem('a'), true, now); it = updateItem(it, true, now);
    expect(it.box).toBe(2); expect(it.due).toBe(now + 2 * DAY);
    expect(updateItem(it, false, now).box).toBe(0);
  });
  it('les items ratés sortent plus souvent que les maîtrisés', () => {
    const bad = updateItem(emptyItem('bad'), false, now - 3 * DAY);
    let good = emptyItem('good'); for (let i = 0; i < 4; i++) good = updateItem(good, true, now);
    const m = new Map([['bad', bad], ['good', good]]); let nb = 0, s = 7;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 1000; i++) if (pickWeighted(['bad', 'good'], x => x, m, r, now) === 'bad') nb++;
    expect(nb).toBeGreaterThan(900);
    expect(weight(bad, now)).toBeGreaterThan(weight(good, now));
  });
});
