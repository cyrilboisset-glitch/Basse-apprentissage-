import Dexie, { type Table } from 'dexie';
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from './settings';

export interface KV { key: string; value: unknown }
export interface NoteStat { midi: number; ok: number; miss: number; totalMs: number; n: number; last: number }
export interface Drill { id?: number; date: string; kind: string; zone: string; accuracy: number; correct: number; wrong: number; seconds: number }
export interface SrsItem { id: string; box: number; due: number; ok: number; miss: number; last: number }
export interface JournalEntry { id?: number; date: string; text: string; minutes: number }
export interface PracticeSession { id?: number; date: string; module: string; seconds: number; score?: number; note?: string }

class BassLabDB extends Dexie {
  kv!: Table<KV, string>;
  sessions!: Table<PracticeSession, number>;
  noteStats!: Table<NoteStat, number>;
  drills!: Table<Drill, number>;
  srs!: Table<SrsItem, string>;
  journal!: Table<JournalEntry, number>;
  constructor(name = 'basslab') {
    super(name);
    this.version(1).stores({ kv: 'key', sessions: '++id, date, module' });
    this.version(2).stores({ kv: 'key', sessions: '++id, date, module', noteStats: 'midi', drills: '++id, zone, date', srs: 'id, due' });
    this.version(3).stores({ kv: 'key', sessions: '++id, date, module', noteStats: 'midi', drills: '++id, zone, date', srs: 'id, due', journal: '++id, date' });
  }
}

export const db = new BassLabDB();

export async function loadSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return mergeSettings(row?.value as Partial<Settings> | undefined);
}
export async function saveSettings(s: Settings): Promise<void> {
  await db.kv.put({ key: 'settings', value: s });
}

export async function exportAll(): Promise<string> {
  return JSON.stringify({
    app: 'basslab', version: 1, exportedAt: new Date().toISOString(),
    kv: await db.kv.toArray(), sessions: await db.sessions.toArray(),
    noteStats: await db.noteStats.toArray(), drills: await db.drills.toArray(), srs: await db.srs.toArray(), journal: await db.journal.toArray(),
  });
}
export async function importAll(json: string): Promise<void> {
  const d = JSON.parse(json);
  if (d?.app !== 'basslab' || !Array.isArray(d.kv) || !Array.isArray(d.sessions)) {
    throw new Error('Fichier de sauvegarde invalide');
  }
  const strip = (rows: any[] = []) => rows.map(({ id: _id, ...r }) => r);
  await db.transaction('rw', [db.kv, db.sessions, db.noteStats, db.drills, db.srs, db.journal], async () => {
    await Promise.all([db.kv.clear(), db.sessions.clear(), db.noteStats.clear(), db.drills.clear(), db.srs.clear(), db.journal.clear()]);
    await db.kv.bulkPut(d.kv); await db.sessions.bulkAdd(strip(d.sessions));
    await db.noteStats.bulkPut(d.noteStats ?? []); await db.drills.bulkAdd(strip(d.drills)); await db.srs.bulkPut(d.srs ?? []); await db.journal.bulkAdd(strip(d.journal));
  });
}

export async function requestPersistence(): Promise<void> {
  try { await navigator.storage?.persist?.(); } catch { /* ignoré */ }
}
export { DEFAULT_SETTINGS };
