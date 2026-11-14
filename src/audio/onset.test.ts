import { describe, it, expect } from 'vitest';
import { detectOnsets, estimateLatencyMs } from './onset';

function envelope(attacks: number[], dur = 6): { t: number; rms: number }[] {
  const f = [];
  for (let t = 0; t < dur; t += 0.01) {
    let v = 0.0005;
    for (const a of attacks) if (t >= a) v = Math.max(v, 0.3 * Math.exp(-(t - a) * 6));
    f.push({ t, rms: v });
  }
  return f;
}
describe('onsets et latence', () => {
  const clicks = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5];
  it('détecte chaque attaque', () => {
    expect(detectOnsets(envelope(clicks)).length).toBe(8);
  });
  it('mesure un retard de 120 ms', () => {
    const on = detectOnsets(envelope(clicks.map(c => c + 0.12)));
    expect(Math.abs(estimateLatencyMs(clicks, on)! - 120)).toBeLessThanOrEqual(15);
  });
  it('refuse une mesure avec trop peu de notes', () => {
    expect(estimateLatencyMs(clicks, [1.1, 1.6])).toBeNull();
  });
});
