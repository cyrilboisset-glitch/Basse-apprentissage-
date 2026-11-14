let lock: { release(): Promise<void> } | null = null;
/** Garde l'écran allumé pendant un exercice (ignoré si non supporté). */
export async function keepAwake(on: boolean) {
  try {
    if (on) lock = await (navigator as any).wakeLock?.request('screen') ?? null;
    else { await lock?.release(); lock = null; }
  } catch { /* facultatif */ }
}
