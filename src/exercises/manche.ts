import { allPositions, scalePosition, ZONES, type Pos } from '../theory/fretboard';
import { ARPEGGIOS } from '../theory/chords';
import { getScale, INTERVAL_LABELS_FR, pc } from '../theory/scales';
import { midiName, type Notation } from '../audio/notes';
import type { Drill, NoteStat } from '../storage/db';
import { pickWeighted } from '../storage/srs';
import type { SrsItem } from '../storage/db';

export type DrillKind = 'hunt' | 'string' | 'quiz' | 'interval' | 'scale' | 'arpeggio';
export const DRILL_LABEL: Record<DrillKind, string> = {
  hunt: 'Chasse aux notes', string: 'Note sur une corde', quiz: 'Quiz visuel',
  interval: "Formes d'intervalles", scale: 'Gammes en positions', arpeggio: 'Arpèges en positions',
};
export interface Zone { from: number; to: number }
export interface Round {
  kind: DrillKind; prompt: string; targets: number[];
  ordered: boolean; any?: boolean;        // any : un seul des targets suffit
  show: Pos[]; labels?: string[]; hideNames?: boolean;
  quizPc?: number;                         // quiz : réponse attendue (classe de hauteur)
  srsId?: string;
}
type Rng = () => number;
const pick = <T,>(a: T[], rng: Rng) => a[Math.floor(rng() * a.length)];
export const STRING_NAMES_FR = ['Mi', 'La', 'Ré', 'Sol'];

export interface Ctx { tuning: number[]; frets: number; zone: Zone; notation: Notation; srs: Map<string, SrsItem>; rng: Rng }
const inZone = (c: Ctx) => allPositions(c.tuning, c.frets).filter(p => p.fret >= c.zone.from && p.fret <= Math.min(c.zone.to, c.frets));
const nm = (midi: number, n: Notation) => midiName(midi, n).name;

export function makeRound(kind: DrillKind, c: Ctx): Round {
  const P = inZone(c);
  switch (kind) {
    case 'hunt': {
      const pcs = [...new Set(P.map(p => pc(p.midi)))];
      const p = pickWeighted(pcs, x => `note:${x}`, c.srs, c.rng);
      const targets = [...new Set(P.filter(x => pc(x.midi) === p).map(x => x.midi))].sort((a, b) => a - b);
      return { kind, prompt: `Jouez tous les ${nm(p, c.notation)} (cases ${c.zone.from}-${Math.min(c.zone.to, c.frets)})`, targets, ordered: false, show: [], srsId: `note:${p}` };
    }
    case 'string': {
      const s = Math.floor(c.rng() * c.tuning.length);
      const onS = P.filter(x => x.string === s);
      const t = pickWeighted(onS, x => `note:${pc(x.midi)}`, c.srs, c.rng);
      const targets = onS.filter(x => pc(x.midi) === pc(t.midi)).map(x => x.midi);
      const sName = nm(c.tuning[s], c.notation);
      return { kind, prompt: `${nm(t.midi, c.notation)} sur la corde de ${sName}`, targets, ordered: false, any: true, show: [], srsId: `note:${pc(t.midi)}` };
    }
    case 'quiz': {
      const t = pickWeighted(P, x => `note:${pc(x.midi)}`, c.srs, c.rng);
      return { kind, prompt: 'Quelle est cette note ?', targets: [t.midi], ordered: false, show: [t], quizPc: pc(t.midi), srsId: `note:${pc(t.midi)}` };
    }
    case 'interval': {
      const semis = pick([12, 7, 5, 4, 3, 10, 11, 9, 8, 2], c.rng);
      const roots = P.filter(x => allPositions(c.tuning, c.frets).some(y => y.midi === x.midi + semis && y.fret <= Math.min(c.zone.to + 3, c.frets) && Math.abs(y.string - x.string) <= 2));
      const r = pick(roots.length ? roots : P, c.rng);
      const tgt = allPositions(c.tuning, c.frets).filter(y => y.midi === r.midi + semis && Math.abs(y.string - r.string) <= 2);
      return { kind, prompt: `Jouez ce ${nm(r.midi, c.notation)} puis la ${INTERVAL_LABELS_FR[semis] === 'octave' ? 'octave' : INTERVAL_LABELS_FR[semis]} au-dessus`, targets: [r.midi, r.midi + semis], ordered: true, show: [r, ...tgt.slice(0, 1)].slice(0, 1), srsId: `interval:${semis}` };
    }
    case 'scale': case 'arpeggio': {
      const defs = kind === 'scale'
        ? ['major', 'minorPent', 'minor', 'majorPent', 'dorian', 'mixolydian', 'blues'].map(id => ({ id, name: getScale(id).name, steps: getScale(id).steps }))
        : ARPEGGIOS.map(a => ({ id: a.id, name: `arpège ${a.suffix || 'majeur'}`, steps: a.steps }));
      const d = pickWeighted(defs, x => `${kind}:${x.id}`, c.srs, c.rng);
      const width = kind === 'scale' ? 4 : 5;
      const lo = c.zone.from, hi = Math.max(lo, Math.min(c.zone.to, c.frets) - width);
      const start = lo + Math.floor(c.rng() * (hi - lo + 1));
      const lowS = c.tuning[0];
      // tonique = une note de la corde grave dans la position
      const rootPc = pc(lowS + start + Math.floor(c.rng() * 3));
      let pos = scalePosition(c.tuning, rootPc, d.steps, start, width);
      // « Relier à la position suivante » : une fois sur deux, on enchaîne deux positions voisines en montant.
      const next = start + 3, linked = kind === 'scale' && next + width <= Math.min(c.zone.to + 3, c.frets) && c.rng() < 0.5;
      if (linked) pos = [...pos, ...scalePosition(c.tuning, rootPc, d.steps, next, width)];
      const targets = [...new Set(pos.map(p => p.midi))].sort((a, b) => a - b);
      return { kind, prompt: linked ? `${d.name} de ${nm(rootPc, c.notation)} : reliez les positions cases ${start} et ${next}, en montant` : `${d.name} de ${nm(rootPc, c.notation)}, position case ${start} : montez les notes`, targets, ordered: true, show: pos, labels: pos.map(p => nm(p.midi, c.notation)), srsId: `${kind}:${d.id}` };
    }
  }
}

// ---- Évaluation d'une manche -------------------------------------------------
export interface RoundState { idx: number; found: Set<number>; correct: number; wrong: number; done: boolean; lastOk: number | null }
export const newState = (): RoundState => ({ idx: 0, found: new Set(), correct: 0, wrong: 0, done: false, lastOk: null });

/** Applique une note jouée ; renvoie 'ok' | 'wrong' | 'ignored'. */
export function applyNote(r: Round, st: RoundState, midi: number): 'ok' | 'wrong' | 'ignored' {
  if (st.done) return 'ignored';
  if (r.ordered) {
    const want = r.targets[st.idx];
    if (midi === want) { st.idx++; st.correct++; st.lastOk = midi; if (st.idx >= r.targets.length) st.done = true; return 'ok'; }
    if (midi === st.lastOk) return 'ignored'; // résonance / répétition de la note précédente
    st.wrong++; return 'wrong';
  }
  if (r.targets.includes(midi)) {
    if (st.found.has(midi) && !r.any) return 'ignored';
    st.found.add(midi); st.correct++; st.lastOk = midi;
    if (r.any || st.found.size >= r.targets.length) st.done = true;
    return 'ok';
  }
  st.wrong++; return 'wrong';
}

// ---- Zones, déblocage, carte de chaleur ---------------------------------------
export const UNLOCK_ACCURACY = 0.9, UNLOCK_SESSIONS = 3;
/** Une zone est « réussie » quand la moyenne des 3 dernières séances de la zone est ≥ 90 % (3 séances minimum). */
export function zoneMastered(drills: Pick<Drill, 'zone' | 'accuracy' | 'date'>[], zoneId: string): boolean {
  const last = drills.filter(d => d.zone === zoneId).slice(-UNLOCK_SESSIONS);
  return last.length >= UNLOCK_SESSIONS && last.reduce((a, d) => a + d.accuracy, 0) / last.length >= UNLOCK_ACCURACY;
}
export function unlockedZones(drills: Pick<Drill, 'zone' | 'accuracy' | 'date'>[], all = false): string[] {
  if (all) return ZONES.map(z => z.id);
  const out = [ZONES[0].id];
  for (let i = 1; i < ZONES.length; i++) { if (zoneMastered(drills, ZONES[i - 1].id)) out.push(ZONES[i].id); else break; }
  return out;
}
export type HeatStatus = 'unseen' | 'ok' | 'slow' | 'bad';
export function heatStatus(st: NoteStat | undefined): HeatStatus {
  if (!st || st.ok + st.miss === 0) return 'unseen';
  const acc = st.ok / (st.ok + st.miss);
  if (acc < 0.7) return 'bad';
  return st.n > 0 && st.totalMs / st.n > 3000 ? 'slow' : acc >= 0.9 ? 'ok' : 'bad';
}
