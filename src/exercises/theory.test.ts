import { describe, it, expect } from 'vitest';
import { LESSONS, CHAPTERS, getLesson, lessonsOf } from './theory';
import { rhy, isFull, onsets, slots, countSyllable, durName, toPattern, totalBeats } from './rhythm';
import { analyzeGroove } from './groove';
import { pc } from '../theory/scales';

let seed = 5; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const offsets = (id: string, k = 0) => { const b = getLesson(id).build(() => 0.37, 'fr'); return b.rounds.map(r => r.targets.map(t => t - r.targets[0])); };

describe('parcours de théorie : structure', () => {
  it('33 leçons en 4 chapitres (9 + 8 + 8 + 8), identifiants uniques', () => {
    expect(LESSONS.length).toBe(33); expect(new Set(LESSONS.map(l => l.id)).size).toBe(33);
    expect(CHAPTERS.map(c => lessonsOf(c.n).length)).toEqual([9, 8, 8, 8]);
  });
  it('les leçons sont rangées par chapitre croissant', () => { const ch = LESSONS.map(l => l.chapter); expect(ch).toEqual([...ch].sort()); });
  it('texte court (≤ 260 mots ≈ 2 minutes), titre présent, chacune suivie d’un exercice ou d’un lien', () => {
    for (const l of LESSONS) {
      const words = l.text.join(' ').split(/\s+/).length; expect(words, l.id).toBeLessThanOrEqual(260); expect(words, l.id).toBeGreaterThan(40); expect(l.title.length).toBeGreaterThan(5);
      const b = l.build(rng, 'fr'); expect(b.quiz.length + b.rounds.length + (b.rhythms?.length ?? 0) + (l.link ? 1 : 0), l.id).toBeGreaterThan(0);
    }
  });
  it('chaque leçon (sauf « rôle de la basse ») propose un quiz ET un exercice joué', () => {
    for (const l of LESSONS) { if (l.id === 'role') continue; const b = l.build(rng, 'fr'); expect(b.quiz.length, l.id).toBeGreaterThanOrEqual(1); expect(b.rounds.length + (b.rhythms?.length ?? 0), l.id).toBeGreaterThanOrEqual(1); }
  });
  it('les chapitres de rythme proposent des exercices de lecture rythmique', () => {
    for (const l of lessonsOf(3).filter(x => x.id !== 'tab')) expect(l.build(rng, 'fr').rhythms!.length, l.id).toBeGreaterThanOrEqual(1);
  });
});

describe('quiz', () => {
  it('bonne réponse valide, choix distincts, au moins deux choix (40 tirages par leçon)', () => {
    for (const l of LESSONS) for (let i = 0; i < 40; i++) for (const q of l.build(rng, 'fr').quiz) {
      expect(q.answer, l.id).toBeGreaterThanOrEqual(0); expect(q.answer, l.id).toBeLessThan(q.choices.length); expect(q.choices.length).toBeGreaterThanOrEqual(2); expect(new Set(q.choices).size, `${l.id} : ${q.q}`).toBe(q.choices.length);
    }
  });
  it('les choix sont mélangés (la bonne réponse n’est pas toujours la première)', () => {
    const pos = new Set<number>(); for (let i = 0; i < 60; i++) pos.add(getLesson('major').build(rng, 'fr').quiz[0].answer); expect(pos.size).toBeGreaterThan(1);
  });
});

describe('exercices joués : cohérents et jouables', () => {
  it('tessiture de la basse, ≥ 3 notes, jamais deux notes identiques de suite (sinon l’exercice bloque)', () => {
    for (const l of LESSONS) for (let i = 0; i < 40; i++) for (const r of l.build(rng, 'fr').rounds) {
      expect(r.targets.length, l.id).toBeGreaterThanOrEqual(3); expect(r.prompt.length).toBeGreaterThan(10);
      r.targets.forEach((m, k) => { expect(m, `${l.id} ${m}`).toBeGreaterThanOrEqual(27); expect(m, `${l.id} ${m}`).toBeLessThanOrEqual(60); if (k) expect(m, l.id).not.toBe(r.targets[k - 1]); });
    }
  });
  it('gammes : schémas exacts (majeure, mineure, modes, pentatoniques, blues)', () => {
    expect(offsets('major')[0]).toEqual([0, 2, 4, 5, 7, 9, 11, 12]);
    expect(offsets('minor')[0]).toEqual([0, 2, 3, 5, 7, 8, 10, 12]);
    expect(offsets('pentatonic')).toEqual([[0, 3, 5, 7, 10, 12], [0, 3, 5, 6, 7, 10, 12]]);
    expect(offsets('modes')).toEqual([[0, 2, 3, 5, 7, 9, 10, 12], [0, 2, 4, 5, 7, 9, 10, 12]]);
    expect(offsets('scale-chord')[0]).toEqual([0, 2, 3, 5, 7, 9, 10, 12]);
  });
  it('bases : demi-tons, tons, intervalles', () => {
    expect(offsets('notes')[0]).toEqual([0, 1, 2, 3, 4]); expect(offsets('tones')[0]).toEqual([0, 2, 3, 5]); expect(offsets('intervals')[0]).toEqual([0, 4, 7, 12]);
  });
  it('cycle des quintes : chaque note est la quinte de la précédente (modulo l’octave)', () => {
    const t = getLesson('fifths').build(rng, 'fr').rounds[0].targets; for (let i = 1; i < t.length; i++) expect(pc(t[i] - t[i - 1])).toBe(7);
  });
  it('accords : arpèges maj/min/7, maj7, m7, degrés, V7 → I', () => {
    expect(offsets('chords')).toEqual([[0, 4, 7], [0, 3, 7], [0, 4, 7, 10]]);
    expect(offsets('seventh')).toEqual([[0, 4, 7, 11], [0, 4, 7, 10], [0, 3, 7, 10]]);
    expect(offsets('harmonized')[0]).toEqual([0, 2, 4, 5, 7, 9]);
    const f = getLesson('functions').build(rng, 'fr').rounds[0].targets; expect(f.slice(0, 4).map(x => x - f[0])).toEqual([0, 4, 7, 10]); expect(pc(f[0] - f[4])).toBe(7); // le I est une quinte sous le V
  });
  it('II – V – I : fondamentales qui descendent de quinte, notes guides par demi-tons', () => {
    const [roots, guide] = getLesson('ii-v-i').build(rng, 'fr').rounds.map(r => r.targets);
    expect([pc(roots[0] - roots[1]), pc(roots[1] - roots[2])]).toEqual([7, 7]); expect(guide.map(x => x - guide[0])).toEqual([0, -1, 5, 4]);
  });
  it('renversements, blues, degrés', () => {
    expect(offsets('inversions')[0]).toEqual([0, 4, 5, 11, 12]); expect(offsets('blues')[0]).toEqual([0, 5, 0, 7, 5, 0]);
    const d = getLesson('degrees').build(rng, 'fr').rounds[0].targets; expect([pc(d[1] - d[0]), pc(d[2] - d[0])]).toEqual([5, 7]); expect(d[3]).toBe(d[0]);
  });
  it('jeu de basse : walking (approches), boogie, fondamentale-quinte-octave', () => {
    expect(offsets('walking')[0]).toEqual([0, 4, 7, 6, 5, 9, 12, 11]);
    expect(offsets('boogie')[0]).toEqual([0, 4, 7, 9, 10, 9, 7, 4]);
    const rf = getLesson('root-fifth').build(rng, 'fr').rounds[0].targets; expect(rf.slice(0, 4).map(x => x - rf[0])).toEqual([0, 7, 0, 12]); expect(rf.slice(4).map(x => x - rf[4])).toEqual([0, 7, 0, 12]); expect(pc(rf[4] - rf[0])).toBe(5);
    const ap = getLesson('approach').build(rng, 'fr').rounds[0].targets; for (let i = 0; i < ap.length; i += 2) expect(ap[i + 1] - ap[i]).toBe(1);
  });
  it('tablature : la tablature affichée correspond exactement aux notes attendues', () => {
    const r = getLesson('tab').build(rng, 'fr').rounds[0]; const open: Record<string, number> = { G: 43, D: 38, A: 33, E: 28 };
    const lines = r.detail!.split('\n'); expect(lines.length).toBe(4); const cells: { col: number; midi: number }[] = [];
    for (const ln of lines) { const body = ln.slice(2, -1); [...body.matchAll(/\d+/g)].forEach(m => cells.push({ col: m.index!, midi: open[ln[0]] + Number(m[0]) })); }
    expect(lines.every(l => l.length === lines[0].length)).toBe(true); expect(cells.sort((a, b) => a.col - b.col).map(c => c.midi)).toEqual(r.targets);
  });
});

describe('solfège rythmique', () => {
  const specs = LESSONS.flatMap(l => l.build(rng, 'fr').rhythms ?? []);
  it('au moins 15 rythmes à lire', () => expect(specs.length).toBeGreaterThanOrEqual(15));
  it('chaque rythme remplit exactement la mesure, avec au moins deux notes par mesure sauf la ronde et la blanche pointée', () => {
    for (const s of specs) { expect(isFull(s), s.name).toBe(true); expect(totalBeats(s)).toBeCloseTo(s.bpb, 6); expect(onsets(s).length, s.name).toBeGreaterThanOrEqual(2); expect(s.bpm).toBeGreaterThanOrEqual(50); expect(s.bpm).toBeLessThanOrEqual(110); }
  });
  it('les silences ne sont pas joués : les attaques sont aux débuts des notes seulement', () => {
    expect(onsets(rhy('t', 4, [1, -1, 1, 1]))).toEqual([0, 2, 3]); expect(onsets(rhy('c', 4, [-0.5, 0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5]))).toEqual([0.5, 1.5, 2.5, 3.5]);
    expect(onsets(rhy('s', 4, [0.5, 1, 1, 1, 0.5]))).toEqual([0, 0.5, 1.5, 2.5, 3.5]); expect(slots(rhy('t', 4, [2, -2])).map(s => s.rest)).toEqual([false, true]);
  });
  it('comptage : 1 e + a, 1 la li', () => {
    expect([0, 0.25, 0.5, 0.75, 1, 1.5, 3.75].map(countSyllable)).toEqual(['1', 'e', '+', 'a', '2', '+', 'a']); expect([0, 1 / 3, 2 / 3, 1].map(countSyllable)).toEqual(['1', 'la', 'li', '2']);
  });
  it('noms des durées (4/4 et mesures composées)', () => {
    expect([4, 2, 1, 0.5, 0.25, 1.5].map(d => durName(d, false))).toEqual(['ronde', 'blanche', 'noire', 'croche', 'double croche', 'noire pointée']);
    expect([1, 0.5].map(d => durName(d, true))).toEqual(['soupir', 'demi-soupir']); expect(durName(1 / 3, false, true)).toBe('croche'); expect(durName(1, false, true)).toBe('noire pointée');
  });
  it('un joueur parfait obtient 100 % sur chaque rythme (mesures à 2, 3 ou 4 temps)', () => {
    for (const s of specs) {
      const bd = 60 / s.bpm, bars = Array.from({ length: s.bars }, (_, i) => ({ time: 3 + i * s.bpb * bd, bpm: s.bpm, audible: true }));
      const played = bars.flatMap(b => onsets(s).map(o => ({ t: b.time + o * bd, midi: 40 as number | null })));
      const r = analyzeGroove(toPattern(s), bars, played, { beatsPerBar: s.bpb }); expect(r.hitPct, s.name).toBe(1); expect(r.missed + r.extra, s.name).toBe(0);
    }
  });
  it('jouer un autre rythme est sanctionné (noires à la place de croches)', () => {
    const s = specs.find(x => x.name === 'Croches')!, bd = 60 / s.bpm, bars = Array.from({ length: 4 }, (_, i) => ({ time: 3 + i * 4 * bd, bpm: s.bpm, audible: true }));
    const played = bars.flatMap(b => [0, 1, 2, 3].map(o => ({ t: b.time + o * bd, midi: 40 as number | null }))); expect(analyzeGroove(toPattern(s), bars, played).hitPct).toBeLessThan(0.7);
  });
});
