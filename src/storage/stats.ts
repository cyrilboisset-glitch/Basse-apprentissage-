import { db, type Drill, type NoteStat } from './db';

export async function recordNote(midi: number, ok: boolean, ms: number) {
  const cur: NoteStat = (await db.noteStats.get(midi)) ?? { midi, ok: 0, miss: 0, totalMs: 0, n: 0, last: 0 };
  if (ok) { cur.ok++; cur.n++; cur.totalMs += Math.min(ms, 15000); } else cur.miss++;
  cur.last = Date.now();
  await db.noteStats.put(cur);
}
export const saveDrill = (d: Omit<Drill, 'id'>) => db.drills.add(d);
export const allDrills = () => db.drills.orderBy('date').toArray();
export const allNoteStats = async () => new Map((await db.noteStats.toArray()).map(n => [n.midi, n]));
export const today = () => new Date().toISOString().slice(0, 10);
