import { getStyle, STYLES, type Voice } from './backing/styles';
import { renderEvent, makeBuses } from './backing/voices';

export const DM_VOICES: { id: Voice; label: string }[] = [{ id: 'kick', label: 'Grosse caisse' }, { id: 'snare', label: 'Caisse claire' }, { id: 'hat', label: 'Charley' }, { id: 'ride', label: 'Ride' }, { id: 'rim', label: 'Rimshot' }, { id: 'tamb', label: 'Tambourin' }];
export type DmPattern = Record<string, boolean[]>;
export const emptyPattern = (): DmPattern => Object.fromEntries(DM_VOICES.map(v => [v.id, Array(16).fill(false)]));
/** Motif de 16 pas d'après la batterie d'un style (les styles ternaires à 12 pas sont étalés sur 16). */
export function patternFromStyle(id: string): DmPattern {
  const st = getStyle(id), p = emptyPattern();
  for (const [v, steps] of Object.entries(st.drums)) if (p[v]) for (const s of steps ?? []) { const k = st.grid === 12 ? Math.round(s * 16 / 12) : s; if (k < 16) p[v][k] = true; }
  return p;
}
export const DM_STYLES = STYLES.filter(s => s.grid === 16);
/** Instant d'un pas (le swing retarde les doubles croches impaires, 1/3 de croche au maximum). */
export const dmStepTime = (t0: number, step: number, bpm: number, swing: number) => t0 + step * 15 / bpm + (step % 2 === 1 ? swing * (15 / bpm) * (2 / 3) : 0);

export class DrumMachine {
  private timer: number | null = null; private next = 0; private step = 0; private b: ReturnType<typeof makeBuses>;
  constructor(private ctx: AudioContext, public pattern: DmPattern, public bpm: number, public swing: number, private onStep?: (s: number, t: number) => void) { this.b = makeBuses(ctx); }
  start() { this.stop(); this.step = 0; this.next = this.ctx.currentTime + 0.1; this.timer = window.setInterval(() => this.pump(), 25); this.pump(); }
  stop() { if (this.timer !== null) clearInterval(this.timer); this.timer = null; }
  dispose() { this.stop(); this.b.out.disconnect(); }
  private pump() {
    while (this.next < this.ctx.currentTime + 0.15) {
      const t = this.next, s = this.step % 16, tt = dmStepTime(t, 0, this.bpm, this.swing) + (s % 2 === 1 ? this.swing * (15 / this.bpm) * (2 / 3) : 0);
      for (const v of DM_VOICES) if (this.pattern[v.id]?.[s]) renderEvent(this.ctx, this.b.buses, { t: tt, voice: v.id, dur: 0.1, vel: v.id === 'hat' ? (s % 4 === 0 ? 0.55 : 0.35) : 0.85 });
      this.onStep?.(s, t); this.next += 15 / this.bpm; this.step++;
    }
  }
}
