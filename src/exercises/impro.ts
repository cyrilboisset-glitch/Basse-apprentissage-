import { chordNotes, noteRole, parseChord, type Chord } from '../theory/chords';
import type { Grid, GridChord } from '../theory/grid';
import { pc } from '../theory/scales';

export type ImproId = 'root' | 'add' | 'targets' | 'chromatic' | 'walking' | 'constraints' | 'qa' | 'copy' | 'free';
export interface ExDef { id: ImproId; n: number; name: string; summary: string; style: string; gridId: string; key: string; bpm: number; laps: number }
export const EXERCISES: ExDef[] = [
  { id: 'root', n: 1, name: 'Une seule note', summary: "Jouez uniquement la fondamentale de l'accord, avec trois rythmes différents.", style: 'blues-shuffle', gridId: 'blues12', key: 'A', bpm: 80, laps: 1 },
  { id: 'add', n: 2, name: 'Ajout progressif', summary: 'Fondamentale + quinte, puis octave, puis tierce, puis septième : un tour par étape.', style: 'rock', gridId: 'I-IV-V', key: 'E', bpm: 90, laps: 4 },
  { id: 'targets', n: 3, name: 'Notes cibles', summary: 'Arrivez sur la tierce du nouvel accord, pile sur le temps 1.', style: 'pop', gridId: 'I-V-vi-IV', key: 'G', bpm: 85, laps: 3 },
  { id: 'chromatic', n: 4, name: 'Approches chromatiques', summary: "Une case sous ou au-dessus de la fondamentale suivante, juste avant le changement d'accord.", style: 'rock', gridId: 'rock-I-bVII-IV', key: 'A', bpm: 85, laps: 3 },
  { id: 'walking', n: 5, name: 'Walking bass', summary: '4 noires par mesure : fondamentale au temps 1, notes d’accord, approche au temps 4.', style: 'jazz', gridId: 'blues12', key: 'F', bpm: 100, laps: 1 },
  { id: 'constraints', n: 6, name: 'Contraintes créatives', summary: 'Un tour par contrainte : 3 notes, peu de notes, en montant, ambitus réduit.', style: 'funk', gridId: 'minor-i-iv-v', key: 'E', bpm: 90, laps: 4 },
  { id: 'qa', n: 7, name: 'Question / réponse', summary: "L'appli joue une phrase d'une mesure, vous répondez sur la mesure suivante.", style: 'pop', gridId: 'I-V-vi-IV', key: 'C', bpm: 85, laps: 4 },
  { id: 'copy', n: 8, name: 'Copie → Variation → Invention', summary: 'Rejouez la phrase, puis changez un seul élément, puis inventez la vôtre.', style: 'soul', gridId: 'I-V-vi-IV', key: 'C', bpm: 85, laps: 3 },
  { id: 'free', n: 9, name: 'Impro libre guidée', summary: "Improvisez librement : les notes sûres de l'accord en cours s'affichent sur le manche.", style: 'blues-shuffle', gridId: 'blues12', key: 'E', bpm: 95, laps: 2 },
];
export const getEx = (id: string) => EXERCISES.find(e => e.id === id)!;

export interface PhraseNote { beat: number; midi: number; dur: number }
export type Mode = 'play' | 'listen';
export interface BarScript {
  mode: Mode; prompt: string; grid8?: boolean;
  expected?: number[];            // positions rythmiques attendues (en temps)
  allowedPcs?: number[];          // hauteurs autorisées
  targetPc?: number; targetLabel?: string;
  approachPcs?: number[];         // pour la mesure suivante (chromatic)
  stage?: number; constraint?: 'three' | 'sparse' | 'ascending' | 'narrow';
  phrase?: PhraseNote[];          // à jouer par l'appli (mode listen) ou à copier
  copyOf?: PhraseNote[]; copyKind?: 'copy' | 'variation' | 'invention';
  octaveNeeded?: boolean; walking?: boolean;
}
type Rng = () => number;
const pick = <T,>(a: T[], r: Rng) => a[Math.floor(r() * a.length)];

export const chordAtBeat = (chords: GridChord[], beat: number): GridChord => {
  let acc = 0; for (const c of chords) { acc += c.beats; if (beat < acc - 1e-9) return c; } return chords[chords.length - 1];
};
const chordOf = (g: Grid, bar: number) => g.bars[bar % g.bars.length][0].chord;
const third = (c: Chord) => c.quality.steps.find(s => s === 3 || s === 4 || (s === 5 && c.quality.id === 'sus4'))!;
const NAMES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export function makePhrase(c: Chord, r: Rng): PhraseNote[] {
  const rhythms = [[0, 1, 2, 3], [0, 1.5, 2, 3], [0, 0.5, 1, 2], [0, 1, 1.5, 3], [0, 2, 3], [0, 1, 2.5]];
  const rh = pick(rhythms, r);
  let root = 28 + ((c.root - 4 + 12) % 12); // racine dans [28, 39]
  const tones = [...c.quality.steps.map(s => root + s), root + 12];
  const notes: PhraseNote[] = [];
  let prev = root;
  rh.forEach((beat, i) => {
    const m = i === 0 ? root : pick(tones.filter(t => t !== prev), r);
    notes.push({ beat, midi: m, dur: i < rh.length - 1 ? (rh[i + 1] - beat) * 0.85 : 0.8 }); prev = m;
  });
  return notes;
}

/** Script de chaque mesure jouée (index = numéro de mesure depuis le début, hors décompte). */
export function makeScripts(ex: ExDef, grid: Grid, laps: number, r: Rng = Math.random): BarScript[] {
  const n = grid.bars.length, out: BarScript[] = [];
  const CONSTR = ['three', 'sparse', 'ascending', 'narrow'] as const;
  const CLAB = { three: 'Seulement 3 notes différentes', sparse: 'Peu de notes : laissez respirer (3 notes max)', ascending: 'Seulement en montant', narrow: 'Une seule corde : restez dans un ambitus de 7 demi-tons' };
  const STAGES = [['root', 'fifth'], ['root', 'fifth'], ['root', 'fifth', 'third'], ['root', 'fifth', 'third', 'seventh']];
  const STAGE_LAB = ['Fondamentale + quinte', 'Ajoutez l\'octave de la fondamentale', 'Ajoutez la tierce', 'Ajoutez la septième'];
  let phrase: PhraseNote[] | null = null;
  for (let lap = 0; lap < laps; lap++) for (let b = 0; b < n; b++) {
    const c = chordOf(grid, b), nx = chordOf(grid, b + 1), sym = c.symbol;
    const tones = chordNotes(c);
    const s: BarScript = { mode: 'play', prompt: '' };
    switch (ex.id) {
      case 'root': {
        const seg = Math.floor(b / Math.max(1, n / 3));
        s.allowedPcs = [c.root]; s.expected = [[0, 1, 2, 3], [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0, 1.5, 2, 3.5]][Math.min(seg, 2)];
        s.prompt = `Fondamentale ${NAMES[c.root]} — ${['noires', 'croches', 'syncopes (1, et du 2, 3, et du 4)'][Math.min(seg, 2)]}`; break; }
      case 'add': {
        const st = Math.min(lap, 3); s.stage = st;
        s.allowedPcs = tones.filter(p => STAGES[st].some(role => role === 'root' ? p === c.root : role === 'fifth' ? pc(p - c.root) === 7 || pc(p - c.root) === 6 : role === 'third' ? pc(p - c.root) === 3 || pc(p - c.root) === 4 : [9, 10, 11].includes(pc(p - c.root))));
        s.octaveNeeded = st === 1; s.prompt = `Étape ${st + 1}/4 : ${STAGE_LAB[st]}`; break; }
      case 'targets': {
        const t = pc(c.root + third(c)); s.targetPc = t; s.allowedPcs = tones; s.prompt = `Arrivez sur la tierce (${NAMES[t]}) au temps 1`;
        s.targetLabel = `Prochaine cible : tierce de ${nx.symbol} (${NAMES[pc(nx.root + third(nx))]})`; break; }
      case 'chromatic': {
        s.allowedPcs = tones; s.approachPcs = [pc(nx.root - 1), pc(nx.root + 1)];
        s.prompt = `Temps 4 : approche de ${NAMES[nx.root]} (${NAMES[pc(nx.root - 1)]} ou ${NAMES[pc(nx.root + 1)]}), puis ${NAMES[nx.root]} sur le 1`; break; }
      case 'walking': {
        s.walking = true; s.expected = [0, 1, 2, 3]; s.allowedPcs = tones;
        s.approachPcs = [pc(nx.root - 1), pc(nx.root + 1), pc(nx.root - 2), pc(nx.root + 2)];
        s.prompt = `Walking : ${NAMES[c.root]} au 1, notes d'accord aux temps 2-3, approche de ${NAMES[nx.root]} au 4`; break; }
      case 'constraints': {
        const k = CONSTR[lap % 4]; s.constraint = k; s.allowedPcs = tones; s.prompt = CLAB[k]; break; }
      case 'qa': {
        if (b % 2 === 0) { phrase = makePhrase(c, r); s.mode = 'listen'; s.phrase = phrase; s.prompt = 'Écoutez la question…'; }
        else { s.allowedPcs = tones; s.prompt = 'À vous de répondre !'; } break; }
      case 'copy': {
        const kind = (['copy', 'variation', 'invention'] as const)[Math.min(lap, 2)];
        if (b % 2 === 0) { phrase = makePhrase(c, r); s.mode = 'listen'; s.phrase = phrase; s.prompt = 'Écoutez la phrase…'; }
        else { s.copyOf = phrase ?? undefined; s.copyKind = kind; s.allowedPcs = tones;
          s.prompt = kind === 'copy' ? 'Rejouez la phrase à l’identique' : kind === 'variation' ? 'Changez UN seul élément (une note ou un rythme)' : 'Inventez votre propre phrase'; } break; }
      case 'free': s.allowedPcs = tones; s.prompt = `Improvisez sur ${sym}`; break;
    }
    out.push(s);
  }
  return out;
}

// ---------------------------------------------------------------------------------------
export interface BarTime { time: number; bpm: number; bar: number }
export interface Played { t: number; midi: number }
export interface Item { bar: number; label: string; ok: boolean }
export interface Metrics { notes: number; inChordPct: number; avoid: number; rhythmPct: number; meanOffsetMs: number; notesPerBar: number; beat1RootPct: number; minorDensity: number }
export interface Result { score: number; items: Item[]; metrics: Metrics; advice: string[] }

interface Placed { midi: number; bar: number; beat: number; chord: Chord; offMs: number }
export function place(bars: BarTime[], grid: Grid, notes: Played[], bpb = 4): Placed[] {
  const out: Placed[] = [];
  for (const n of notes) {
    let j = -1;
    for (let i = 0; i < bars.length; i++) if (bars[i].time - 0.12 * (60 / bars[i].bpm) <= n.t) j = i; else break;
    if (j < 0) continue;
    const bd = 60 / bars[j].bpm, beat = (n.t - bars[j].time) / bd;
    if (beat >= bpb + 0.12) continue; // après la dernière mesure
    const g = Math.round(beat * 2) / 2;
    out.push({ midi: n.midi, bar: j, beat, chord: chordAtBeat(grid.bars[bars[j].bar], Math.max(0, beat)).chord, offMs: (beat - g) * bd * 1000 });
  }
  return out;
}
const tolBeats = (bpm: number) => Math.min(0.09 * bpm / 60, 0.2); // 90 ms ou 0,2 temps
const near = (beat: number, target: number, bpm: number) => Math.abs(beat - target) <= tolBeats(bpm) + 0.001;
const isChordRole = (r: string) => r === 'root' || r === 'third' || r === 'fifth' || r === 'seventh';

export function analyze(ex: ExDef, bars: BarTime[], scripts: BarScript[], grid: Grid, notes: Played[]): Result {
  const placed = place(bars, grid, notes);
  const byBar = bars.map((_, i) => placed.filter(p => p.bar === i));
  const playBars = bars.map((_, i) => i).filter(i => scripts[i]?.mode === 'play');
  const items: Item[] = [];
  const bpmOf = (i: number) => bars[i].bpm;

  for (const i of playBars) {
    const sc = scripts[i], ns = byBar[i], c = grid.bars[bars[i].bar][0].chord, bpm = bpmOf(i);
    const nextNs = byBar[i + 1] ?? [], nextC = grid.bars[bars[(i + 1) % bars.length].bar][0].chord;
    const nextExists = i + 1 < bars.length;
    const label = `Mesure ${bars[i].bar + 1}`;
    switch (ex.id) {
      case 'root': {
        const exp = sc.expected!; const hit = exp.filter(e => ns.some(p => near(p.beat, e, bpm) && pc(p.midi) === c.root)).length;
        const extra = ns.filter(p => !exp.some(e => near(p.beat, e, bpm)) || pc(p.midi) !== c.root).length;
        items.push({ bar: i, label, ok: hit / exp.length >= 0.75 && extra <= 1 }); break; }
      case 'add': {
        const wrong = ns.filter(p => !sc.allowedPcs!.includes(pc(p.midi))).length;
        const oct = !sc.octaveNeeded || (() => { const r = ns.filter(p => pc(p.midi) === c.root).map(p => p.midi); return r.length > 1 && Math.max(...r) - Math.min(...r) >= 12; })();
        items.push({ bar: i, label, ok: ns.length >= 2 && wrong === 0 && oct }); break; }
      case 'targets': {
        const ok = ns.some(p => near(p.beat, 0, bpm) && pc(p.midi) === sc.targetPc); items.push({ bar: i, label: `${label} : cible`, ok }); break; }
      case 'chromatic': {
        if (!nextExists) break;
        const app = ns.some(p => p.beat >= 2.4 && p.beat < 4.1 && sc.approachPcs!.includes(pc(p.midi)));
        const arr = nextNs.some(p => near(p.beat, 0, bpm) && pc(p.midi) === nextC.root);
        items.push({ bar: i, label: `${label} → ${bars[i + 1].bar + 1}`, ok: app && arr }); break; }
      case 'walking': {
        const at = (b: number) => ns.find(p => near(p.beat, b, bpm));
        const b0 = at(0), b1 = at(1), b2 = at(2), b3 = at(3);
        if (!nextExists) break;
        items.push({ bar: i, label: `${label} · temps 1`, ok: !!b0 && pc(b0.midi) === c.root });
        items.push({ bar: i, label: `${label} · temps 2-3`, ok: !!b1 && !!b2 && sc.allowedPcs!.includes(pc(b1.midi)) && sc.allowedPcs!.includes(pc(b2.midi)) });
        items.push({ bar: i, label: `${label} · approche`, ok: !!b3 && sc.approachPcs!.includes(pc(b3.midi)) });
        void nextC; break; }
      case 'constraints': {
        const m = ns.map(p => p.midi); let ok = m.length > 0;
        if (sc.constraint === 'three') ok = ok && new Set(m.map(pc)).size <= 3;
        if (sc.constraint === 'sparse') ok = ok && m.length <= 3;
        if (sc.constraint === 'ascending') ok = ok && m.length >= 3 && m.every((x, k) => k === 0 || x >= m[k - 1]);
        if (sc.constraint === 'narrow') ok = ok && Math.max(...m) - Math.min(...m) <= 7;
        items.push({ bar: i, label: `${label} : ${sc.constraint}`, ok }); break; }
      case 'qa': {
        const inC = ns.filter(p => isChordRole(noteRole(pc(p.midi), p.chord))).length;
        const rhy = ns.filter(p => Math.abs(p.offMs) <= Math.min(90, tolBeats(bpm) * 60000 / bpm)).length;
        items.push({ bar: i, label: `${label} : réponse`, ok: ns.length >= 2 && inC / ns.length >= 0.6 && rhy / ns.length >= 0.6 }); break; }
      case 'copy': {
        const src = sc.copyOf ?? [];
        const seqEq = src.map((s, k) => { const p = ns[k]; return !!p && pc(p.midi) === pc(s.midi) && near(p.beat, s.beat, bpm); });
        const sim = src.length ? seqEq.filter(Boolean).length / src.length : 0;
        const wrongCount = src.length - seqEq.filter(Boolean).length + Math.max(0, ns.length - src.length);
        const inC = ns.length ? ns.filter(p => isChordRole(noteRole(pc(p.midi), p.chord))).length / ns.length : 0;
        const ok = sc.copyKind === 'copy' ? sim >= 0.99 && ns.length === src.length
          : sc.copyKind === 'variation' ? wrongCount === 1 && ns.length >= 2
          : ns.length >= 2 && sim < 0.5 && inC >= 0.6;
        items.push({ bar: i, label: `${label} : ${sc.copyKind}`, ok }); break; }
      case 'free': break;
    }
  }

  // Métriques globales sur les mesures jouées
  const P = playBars.flatMap(i => byBar[i]);
  const roles = P.map(p => noteRole(pc(p.midi), p.chord));
  const inChord = roles.filter(isChordRole).length;
  const within = P.filter(p => Math.abs(p.offMs) <= 90).length;
  const minorNs = P.filter(p => p.chord.quality.steps.includes(3));
  const minorBars = new Set(minorNs.map(p => p.bar)).size;
  const beat1 = playBars.map(i => byBar[i].find(p => Math.abs(p.beat) < 0.25));
  const m: Metrics = {
    notes: P.length, inChordPct: P.length ? inChord / P.length : 0, avoid: roles.filter(r => r === 'avoid').length,
    rhythmPct: P.length ? within / P.length : 0, meanOffsetMs: P.length ? P.reduce((a, p) => a + p.offMs, 0) / P.length : 0,
    notesPerBar: playBars.length ? P.length / playBars.length : 0,
    beat1RootPct: beat1.filter(Boolean).length ? beat1.filter(p => p && pc(p.midi) === p.chord.root).length / beat1.filter(Boolean).length : 0,
    minorDensity: minorBars ? minorNs.length / minorBars : 0,
  };
  const score = items.length ? Math.round(100 * items.filter(i => i.ok).length / items.length)
    : Math.round(100 * (0.6 * m.inChordPct + 0.4 * m.rhythmPct) * (P.length >= 4 ? 1 : 0));
  return { score, items, metrics: m, advice: teacherAdvice(ex.id, m, items, score) };
}

/** Conseil de prof : règles concrètes, au plus 3, les plus utiles d'abord. */
export function teacherAdvice(id: ImproId, m: Metrics, items: Item[], score: number): string[] {
  const a: string[] = [];
  if (m.notes < 3) return ["Je n'ai presque rien entendu : vérifiez l'entrée audio (Matériel) et jouez plus franchement."];
  if (m.avoid > 0 && m.avoid >= m.notes * 0.1) a.push(`Vous avez joué ${m.avoid} fois une note « à éviter » (comme la quarte sur un accord dominant). Passez-y vite, sans la tenir, ou résolvez sur la tierce.`);
  if (m.minorDensity > 5) a.push('Vous jouez trop de notes sur les accords mineurs : laissez respirer, un silence met la note suivante en valeur.');
  else if (m.notesPerBar > 7 && id !== 'root') a.push('Beaucoup de notes par mesure : essayez d’en jouer moitié moins, mais toutes bien placées.');
  if (m.inChordPct < 0.6 && id !== 'root') a.push(`Seulement ${Math.round(m.inChordPct * 100)} % de vos notes sont dans l'accord. Appuyez-vous sur la fondamentale et la tierce, surtout au temps 1.`);
  if (m.meanOffsetMs > 25) a.push(`Vous êtes en retard d'environ ${Math.round(m.meanOffsetMs)} ms. Anticipez un peu, ou calibrez la latence dans Matériel.`);
  else if (m.meanOffsetMs < -25) a.push(`Vous êtes en avance d'environ ${Math.round(-m.meanOffsetMs)} ms : écoutez la grosse caisse et attendez le temps.`);
  else if (m.rhythmPct < 0.7) a.push('Votre placement est irrégulier : jouez moins de notes mais pile sur le temps. Le rythme passe avant le choix des notes.');
  if (m.beat1RootPct < 0.5 && m.notes >= 8 && id !== 'root') a.push('Pensez à la fondamentale sur le premier temps de chaque changement d’accord : elle donne l’appui à tout le groupe.');
  const targets = items.filter(i => /cible|→/.test(i.label));
  if (targets.length >= 3 && targets.filter(i => i.ok).length / targets.length < 0.5) a.push('Préparez votre cible dès le temps 3 de la mesure précédente : regardez où elle est sur le manche avant d’y aller.');
  if (!a.length) a.push(score >= 85 ? 'Très propre ! Montez le tempo de 5 BPM ou passez à l’exercice suivant.' : 'Bonne base. Refaites l’exercice en vous concentrant sur une seule chose : le placement sur le temps.');
  return a.slice(0, 3);
}
export const parseSym = (s: string) => parseChord(s)!;
