import type { ProgressData } from './data';
import { evaluateLevels } from './levels';
import { unlockedZones, type DrillKind } from '../exercises/manche';
import { ZONES } from '../theory/fretboard';
import { PHRASES } from '../exercises/vocab';
import { EXERCISES, type ImproId } from '../exercises/impro';
import { weight } from '../storage/srs';
import { LESSONS } from '../exercises/theory';
import { countSessions } from './data';

export type Step =
  | { type: 'warmup'; minutes: number; title: string; pattern: string }
  | { type: 'manche'; minutes: number; title: string; kind: DrillKind; zone: string }
  | { type: 'theory'; minutes: number; title: string; lesson: string }
  | { type: 'vocab'; minutes: number; title: string; phrase: string }
  | { type: 'groove'; minutes: number; title: string; pattern: string }
  | { type: 'impro'; minutes: number; title: string; ex: ImproId }
  | { type: 'ear'; minutes: number; title: string; kind: 'interval' | 'chord' | 'degree' | 'line' };

const IMPRO_BY_LEVEL: ImproId[][] = [['root'], ['root'], ['root', 'add'], ['add', 'targets'], ['targets', 'chromatic'], ['root', 'add', 'targets'], ['chromatic', 'walking', 'constraints'], ['qa', 'copy', 'free', 'walking']];
/** Première leçon du parcours pas encore validée (70 %), sinon on révise dans l'ordre. */
export const nextLesson = (d: ProgressData, rng: () => number = Math.random) => (LESSONS.find(l => countSessions(d, `theory:${l.id}`, 70) === 0) ?? LESSONS[Math.floor(rng() * LESSONS.length)]).id;
const GROOVE_BY_LEVEL = ['q', 'q', 'e', 'e', 's', 'sync', 'off', 'funk16'];

/** Choisit la valeur la plus « urgente » : poids de répétition espacée le plus fort. */
function urgentPhrase(d: ProgressData, rng: () => number) {
  const m = new Map(d.srs.map(i => [i.id, i])); const now = Date.now();
  const scored = PHRASES.map(p => ({ p, w: weight(m.get(`phrase:${p.id}`), now) + rng() * 0.5 }));
  return scored.sort((a, b) => b.w - a.w)[0].p;
}
function weakestKind(d: ProgressData, zone: string): DrillKind {
  const kinds: DrillKind[] = ['hunt', 'string', 'quiz', 'interval', 'scale', 'arpeggio'];
  const last = (k: DrillKind) => { const r = d.drills.filter(x => x.kind === k && x.zone === zone).slice(-2); return r.length ? r.reduce((a, x) => a + x.accuracy, 0) / r.length : 0.5; };
  return kinds.map(k => ({ k, a: last(k) })).sort((a, b) => a.a - b.a)[0].k;
}

/** Séance du jour : 10, 20 ou 30 min, adaptée au niveau, aux zones débloquées et aux faiblesses. */
export function buildSession(minutes: 10 | 20 | 30, d: ProgressData, level?: number, rng: () => number = Math.random, unlockAll = false): Step[] {
  const lv = Math.min(8, level ?? evaluateLevels(d).current) - 1;
  const zones = unlockedZones(d.drills, unlockAll); const zone = zones[zones.length - 1] === 'z4' && rng() < 0.4 ? zones[Math.max(0, zones.length - 2)] : zones[zones.length - 1];
  const impro = IMPRO_BY_LEVEL[lv][Math.floor(rng() * IMPRO_BY_LEVEL[lv].length)];
  const exName = EXERCISES.find(e => e.id === impro)!.name; const z = ZONES.find(x => x.id === zone)!;
  const warm: Step = { type: 'warmup', minutes: minutes === 10 ? 1 : 2, title: 'Échauffement : cordes à vide au métronome', pattern: 'open' };
  const manche: Step = { type: 'manche', minutes: minutes === 10 ? 3 : 5, title: `Manche — ${z.label}`, kind: weakestKind(d, zone), zone };
  const ph = urgentPhrase(d, rng); const vocab: Step = { type: 'vocab', minutes: minutes === 10 ? 2 : 4, title: `Phrase : ${ph.name}`, phrase: ph.id };
  const theory: Step = { type: 'theory', minutes: 3, title: 'Théorie appliquée', lesson: nextLesson(d, rng) };
  const imp: Step = { type: 'impro', minutes: minutes === 10 ? 4 : minutes === 20 ? 7 : 10, title: `Improvisation — ${exName}`, ex: impro };
  const gr: Step = { type: 'groove', minutes: minutes === 30 ? 5 : 3, title: 'Groove et mise en place', pattern: GROOVE_BY_LEVEL[lv] };
  const ear: Step = { type: 'ear', minutes: 3, title: 'Oreille', kind: (['interval', 'chord', 'degree', 'line'] as const)[lv % 4] };
  if (minutes === 10) return [warm, manche, imp];
  if (minutes === 20) return [warm, manche, vocab, imp, gr];
  return [warm, manche, theory, vocab, gr, imp, ear];
}
export const totalMinutes = (s: Step[]) => s.reduce((a, x) => a + x.minutes, 0);
