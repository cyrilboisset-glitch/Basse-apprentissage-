import type { Drill, PracticeSession, SrsItem } from '../storage/db';

export interface ProgressData { drills: Drill[]; sessions: PracticeSession[]; srs: SrsItem[]; today: string }
export const bestScore = (d: ProgressData, module: string) => Math.max(0, ...d.sessions.filter(s => s.module === module).map(s => s.score ?? 0));
export const countSessions = (d: ProgressData, module: string, min = 0) => d.sessions.filter(s => s.module === module && (s.score ?? 0) >= min).length;
/** Les notes de séance Groove : « 90 BPM ±12 ms » ; Impro : « F 90 BPM ». */
export const noteBpm = (s: PracticeSession) => Number(/(\d+)\s*BPM/.exec(s.note ?? '')?.[1] ?? 0);
export const noteSd = (s: PracticeSession) => Number(/±(\d+)/.exec(s.note ?? '')?.[1] ?? NaN);
export const noteKey = (s: PracticeSession) => /^([A-G][#b]?)\s/.exec(s.note ?? '')?.[1] ?? '';
export const phrasesValidated = (d: ProgressData) => d.srs.filter(i => i.id.startsWith('phrase:') && i.ok > 0 && i.box >= 1).length;
export const dayOf = (iso: string) => iso.slice(0, 10);
export const practiceDays = (d: ProgressData) => new Set([...d.drills.map(x => x.date), ...d.sessions.map(x => x.date)].map(dayOf));
