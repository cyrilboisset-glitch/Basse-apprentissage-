import { describe, it, expect } from 'vitest';
import { LESSONS } from './theory';
import { pc } from '../theory/scales';

let seed = 5; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
describe('théorie appliquée', () => {
  it('6 leçons, texte court (≤ 2 min de lecture ≈ 260 mots), chacune suivie d’un exercice', () => {
    expect(LESSONS.length).toBe(6);
    for (const l of LESSONS) { const words = l.text.join(' ').split(/\s+/).length; expect(words, l.id).toBeLessThanOrEqual(260); const b = l.build(rng, 'fr'); expect(b.quiz.length + b.rounds.length + (l.link ? 1 : 0), l.id).toBeGreaterThan(0); }
  });
  it('les questions ont une bonne réponse valide', () => {
    for (const l of LESSONS) for (let i = 0; i < 30; i++) for (const q of l.build(rng, 'fr').quiz) { expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(q.choices.length); }
  });
  it('gamme/accord : la bonne réponse correspond à la gamme associée à l’accord', () => {
    const l = LESSONS.find(x => x.id === 'scale-chord')!; const b = l.build(rng, 'fr');
    expect(b.quiz.map(q => q.choices[q.answer])).toEqual(['Dorien', 'Mixolydien', 'Locrien']);
  });
  it('les exercices joués sont dans la tessiture de la basse et cohérents', () => {
    for (const l of LESSONS) for (let i = 0; i < 40; i++) for (const r of l.build(rng, 'fr').rounds) { expect(r.targets.length).toBeGreaterThanOrEqual(3); for (const m of r.targets) { expect(m).toBeGreaterThanOrEqual(27); expect(m).toBeLessThanOrEqual(60); } }
  });
  it('arpèges : intervalles exacts (majeur 0-4-7, mineur 0-3-7, 7 = 0-4-7-10)', () => {
    const r = LESSONS[0].build(rng, 'fr').rounds; expect(r.map(x => x.targets.map(t => t - x.targets[0]))).toEqual([[0, 4, 7], [0, 3, 7], [0, 4, 7, 10]]);
  });
  it('degrés : I – IV – V – I', () => { const t = LESSONS[2].build(rng, 'fr').rounds[0].targets; expect([t[1] - t[0], t[2] - t[0]].map(x => pc(x))).toEqual([5, 7]); expect(t[3]).toBe(t[0]); });
  it('approches : demi-ton sous chaque cible', () => { const t = LESSONS[4].build(rng, 'fr').rounds[0].targets; for (let i = 0; i < t.length; i += 2) expect(t[i + 1] - t[i]).toBe(1); });
});
