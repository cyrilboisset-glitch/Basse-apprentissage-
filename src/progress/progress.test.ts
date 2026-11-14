import { describe, it, expect } from 'vitest';
import { LEVELS, evaluateLevels, nextObjective } from './levels';
import { computeStreak, isoWeek, weeklyMinutes } from './streak';
import { BADGES, earnedBadges } from './badges';
import { buildSession, totalMinutes } from './session';
import type { ProgressData } from './data';
import { ZONES } from '../theory/fretboard';

const empty = (): ProgressData => ({ drills: [], sessions: [], srs: [], today: '2026-11-14' });
const zoneDone = (id: string) => [1, 2, 3].map(() => ({ zone: id, accuracy: 0.95, date: '2026-11-01', kind: 'hunt', correct: 9, wrong: 1, seconds: 60 }));
const sess = (module: string, score: number, note = '', date = '2026-11-10') => ({ module, score, note, date, seconds: 300 });

describe('niveaux', () => {
  it('au moins 8 niveaux, chacun avec un objectif et des critères', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(8);
    for (const l of LEVELS) { expect(l.goal.length).toBeGreaterThan(10); expect(l.criteria(empty()).length).toBeGreaterThan(0); }
  });
  it('départ au niveau 1 ; prochain objectif concret', () => {
    expect(evaluateLevels(empty()).current).toBe(1); expect(nextObjective(empty())).toMatch(/Cases 0-5/);
  });
  it('niveau 1 validé : zone 0-5 + noires à 70 BPM', () => {
    const d: ProgressData = { ...empty(), drills: zoneDone('z0') as any, sessions: [sess('groove:q', 85, '75 BPM ±20 ms')] as any };
    expect(evaluateLevels(d).current).toBe(2);
  });
  it('un niveau n’est pas validé tant qu’un critère manque', () => {
    const d: ProgressData = { ...empty(), drills: zoneDone('z0') as any }; expect(evaluateLevels(d).current).toBe(1);
  });
  it('« walking sur un blues en Fa à 90 BPM »', () => {
    const base = { ...empty(), sessions: [sess('impro:chromatic', 80), sess('impro:constraints', 80)] as any };
    expect(evaluateLevels({ ...base, drills: [] }).states[6].done).toBe(false);
    expect(evaluateLevels({ ...base, sessions: [...base.sessions, sess('impro:walking', 75, 'F 85 BPM')] }).states[6].done).toBe(false);
    expect(evaluateLevels({ ...base, sessions: [...base.sessions, sess('impro:walking', 75, 'F 90 BPM')] }).states[6].done).toBe(true);
    expect(evaluateLevels({ ...base, sessions: [...base.sessions, sess('impro:walking', 75, 'Bb 100 BPM')] }).states[6].done).toBe(false);
  });
  it('tous les niveaux validés → current = 9', () => {
    const d: ProgressData = { today: '2026-11-14', drills: [...ZONES.flatMap(z => zoneDone(z.id)), ...Array(3).fill(0).flatMap(() => [{ zone: 'z4', kind: 'scale', accuracy: .9, date: '', correct: 1, wrong: 0, seconds: 1 }, { zone: 'z4', kind: 'arpeggio', accuracy: .9, date: '', correct: 1, wrong: 0, seconds: 1 }])] as any,
      sessions: [sess('groove:q', 90, '80 BPM ±10 ms'), sess('groove:e', 90, '95 BPM ±10 ms'), sess('groove:sync', 90, '80 BPM ±10 ms'), sess('groove:s', 90, '80 BPM ±10 ms'), sess('ear:interval', 90), sess('ear:chord', 90),
        sess('impro:root', 90), sess('impro:add', 90), sess('impro:targets', 90), sess('impro:chromatic', 90), sess('impro:constraints', 90), sess('impro:walking', 90, 'F 90 BPM'), sess('impro:qa', 90), sess('impro:copy', 90), sess('impro:free', 90), sess('impro:free', 90)] as any,
      srs: Array.from({ length: 10 }, (_, i) => ({ id: `phrase:p${i}`, box: 2, ok: 2, miss: 0, due: 0, last: 1 })) };
    const ev = evaluateLevels(d); expect(ev.states.filter(x => !x.done).map(x => [x.level.n, x.criteria.filter(c => !c.ok).map(c => c.label)])).toEqual([]);
    expect(ev.current).toBe(9); expect(nextObjective(d)).toMatch(/Tous les niveaux/);
  });
});
describe('série de jours avec joker', () => {
  const S = (...d: string[]) => new Set(d);
  it('jours consécutifs', () => expect(computeStreak(S('2026-11-12', '2026-11-13', '2026-11-14'), '2026-11-14').days).toBe(3));
  it('aujourd’hui pas encore pratiqué : la série d’hier reste valable', () => { const s = computeStreak(S('2026-11-12', '2026-11-13'), '2026-11-14'); expect(s.days).toBe(2); expect(s.practicedToday).toBe(false); });
  it('un jour manqué par semaine ne casse pas la série (joker)', () => {
    const s = computeStreak(S('2026-11-09', '2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14'), '2026-11-14'); // 11 manqué (lun-dim : même semaine)
    expect(s.days).toBe(5); expect(s.jokersUsed).toBe(1);
  });
  it('deux jours manqués d’affilée cassent la série', () => expect(computeStreak(S('2026-11-09', '2026-11-12', '2026-11-13'), '2026-11-13').days).toBe(2));
  it('deux manques dans la même semaine : un seul joker', () => {
    expect(computeStreak(S('2026-11-09', '2026-11-11', '2026-11-13', '2026-11-14'), '2026-11-14').days).toBe(3); // 14, 13, joker le 12, 11 ; le 10 est un 2ᵉ manque dans la semaine → coupe
  });
  it('rien pratiqué : 0', () => expect(computeStreak(S(), '2026-11-14').days).toBe(0));
  it('semaine ISO', () => { expect(isoWeek('2026-11-14')).toBe('2026-W46'); expect(isoWeek('2026-01-01')).toBe('2026-W01'); expect(isoWeek('2024-12-30')).toBe('2025-W01'); });
  it('minutes par semaine', () => { const w = weeklyMinutes([{ date: '2026-11-14', seconds: 1200 }, { date: '2026-11-09', seconds: 600 }], 3, '2026-11-14'); expect(w.at(-1)!.minutes).toBe(30); expect(w.length).toBe(3); });
});
describe('badges', () => {
  it('aucun badge au départ (ouvrir l’appli ne suffit pas)', () => expect(earnedBadges(empty())).toEqual([]));
  it('badges liés à de vrais progrès', () => {
    const d: ProgressData = { ...empty(), drills: zoneDone('z0') as any, sessions: [sess('groove:e', 95, '110 BPM ±12 ms'), sess('impro:walking', 85, 'F 90 BPM')] as any };
    expect(earnedBadges(d).map(b => b.id).sort()).toEqual(['metronome', 'regulier', 'walking', 'zone1'].sort());
  });
  it('identifiants uniques', () => expect(new Set(BADGES.map(b => b.id)).size).toBe(BADGES.length));
});
describe('séance du jour', () => {
  it('durées proches de 10 / 20 / 30 minutes', () => {
    for (const m of [10, 20, 30] as const) for (let lv = 1; lv <= 8; lv++) { const t = totalMinutes(buildSession(m, empty(), lv)); expect(Math.abs(t - m), `${m} min niv. ${lv}`).toBeLessThanOrEqual(3); }
  });
  it('contient échauffement, manche et improvisation ; 30 min ajoute théorie, vocabulaire, groove, oreille', () => {
    expect(buildSession(10, empty(), 1).map(s => s.type)).toEqual(['warmup', 'manche', 'impro']);
    expect(new Set(buildSession(30, empty(), 3).map(s => s.type))).toEqual(new Set(['warmup', 'manche', 'theory', 'vocab', 'groove', 'impro', 'ear']));
  });
  it('n’utilise que des zones débloquées', () => { for (let i = 0; i < 20; i++) { const m = buildSession(20, empty(), 1).find(s => s.type === 'manche') as any; expect(m.zone).toBe('z0'); } });
  it('cible le type d’exercice le plus faible de la zone', () => {
    const d = { ...empty(), drills: ['hunt', 'string', 'quiz', 'interval', 'arpeggio'].map(k => ({ zone: 'z0', kind: k, accuracy: .8, date: '', correct: 1, wrong: 0, seconds: 1 })) as any };
    expect((buildSession(20, d, 1).find(s => s.type === 'manche') as any).kind).toBe('scale');
  });
  it('la phrase proposée est celle qui est due (jamais vue ou ratée)', () => {
    const d = { ...empty(), srs: [{ id: 'phrase:blues-01', box: 5, ok: 9, miss: 0, due: Date.now() + 1e10, last: Date.now() }] };
    expect((buildSession(20, d, 1, () => 0.1).find(s => s.type === 'vocab') as any).phrase).not.toBe('blues-01');
  });
});
