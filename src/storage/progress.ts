import { db } from './db';
import { today } from './stats';
import type { ProgressData } from '../progress/data';

export async function loadProgress(): Promise<ProgressData> {
  const [drills, sessions, srs] = await Promise.all([db.drills.toArray(), db.sessions.toArray(), db.srs.toArray()]);
  return { drills, sessions, srs, today: today() };
}
export async function getPlacement(): Promise<{ level: number; date: string } | null> { return ((await db.kv.get('placement'))?.value as any) ?? null; }
