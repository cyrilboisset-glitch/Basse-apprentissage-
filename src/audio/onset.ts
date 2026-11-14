export interface LevelFrame { t: number; rms: number }

/** Détecte les attaques dans une enveloppe RMS (frames ~10 ms) : montée brusque au-dessus d'un seuil adaptatif. */
export function detectOnsets(frames: LevelFrame[], minGapS = 0.08, ratio = 2.5, floor = 0.01): number[] {
  const out: number[] = [];
  let avg = frames[0]?.rms ?? 0;
  for (let i = 1; i < frames.length; i++) {
    const { t, rms } = frames[i];
    if (rms > floor && rms > avg * ratio && (!out.length || t - out[out.length - 1] > minGapS)) out.push(t);
    avg = avg * 0.9 + rms * 0.1;
  }
  return out;
}

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/**
 * Latence = médiane (attaque − clic le plus proche), en ms. Inclut le temps de réaction humain :
 * c'est voulu, on compense ce que l'utilisateur « ressent » comme décalage.
 */
export function estimateLatencyMs(clicks: number[], onsets: number[], maxMs = 400): number | null {
  const diffs: number[] = [];
  for (const o of onsets) {
    let best = Infinity;
    for (const c of clicks) if (Math.abs(o - c) < Math.abs(best)) best = o - c;
    if (Math.abs(best) * 1000 <= maxMs) diffs.push(best * 1000);
  }
  return diffs.length >= 4 ? Math.round(median(diffs)) : null;
}
