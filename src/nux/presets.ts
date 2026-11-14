import { useEffect, useState } from 'preact/hooks';
import { nux, type NuxStatus } from './plugpro';
import type { Settings } from '../storage/settings';

export const CATEGORIES: [string, string][] = [['clean', 'Manche, théorie, oreille (son clair)'], ['blues', 'Blues'], ['funk', 'Funk / groove'], ['rock', 'Rock (saturé)'], ['pop', 'Pop'], ['reggae', 'Reggae'], ['soul', 'Soul / Motown'], ['jazz', 'Jazz'], ['latin', 'Latin']];
/** Change de preset selon la catégorie si le Plug Pro est connecté et l'option activée. Ne lève jamais d'erreur. */
export async function applyPresetFor(category: string, s: Settings): Promise<boolean> {
  try { const n = s.presetMap[category] ?? 0; if (!s.nuxAuto || !nux.connected || n < 1) return false; return await nux.setPreset(n); } catch { return false; }
}
export const BACKING_CATEGORY: Record<string, string> = { 'blues-shuffle': 'blues', 'blues-slow': 'blues', funk: 'funk', rock: 'rock', pop: 'pop', reggae: 'reggae', bossa: 'latin', jazz: 'jazz', soul: 'soul' };
export function useNuxStatus(): NuxStatus { const [st, set] = useState(nux.status); useEffect(() => nux.subscribeStatus(set), []); return st; }
