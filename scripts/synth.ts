/** Synthèse de notes de basse pour les fichiers de référence. */

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteName = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const SR = 48000;

/** Corde pincée : harmoniques décroissantes (les aigus s'éteignent plus vite), léger désaccord d'inharmonicité, attaque brève, bruit de doigt, souffle de fond. */
export function pluck(f: number, weakFund: boolean): Float32Array {
  const n = Math.floor(SR * 0.45), out = new Float32Array(n); const harm = Array.from({ length: 10 }, (_, k) => ({ h: k + 1, ph: rnd() * 6.28, a: (k === 0 && weakFund ? 0.3 : 1) / Math.pow(k + 1, 0.9) }));
  const B = 0.00005; // inharmonicité
  for (let i = 0; i < n; i++) {
    const t = i / SR; let v = 0;
    for (const { h, ph, a } of harm) { const fh = f * h * Math.sqrt(1 + B * h * h); if (fh < SR / 2.2) v += a * Math.exp(-t * (1.5 + 2.2 * h)) * Math.sin(2 * Math.PI * fh * t + ph); }
    const att = Math.min(1, t / 0.004), click = t < 0.02 ? (rnd() * 2 - 1) * 0.25 * Math.exp(-t * 200) : 0;
    out[i] = (0.35 * v * att + click + (rnd() * 2 - 1) * 0.003);
  }
  return out;
}
