import type { Grid } from '../../theory/grid';
import { getStyle } from './styles';
import { planBar } from './plan';
import { masterChain, renderEvent, type Buses } from './voices';

export interface BackingOptions {
  style: string; bpm: number; swing: number; laps: number; countIn: number; // laps 0 = infini
  section?: { from: number; to: number };      // mesures (0-based, incluses) rejouées en boucle
  accelPerLap?: number;                        // +BPM à chaque tour
  mute: { drums: boolean; keys: boolean; gtr: boolean };
}
export interface BarInfo { seq: number; bar: number; lap: number; time: number; bpm: number; countIn: boolean }

/** Joue grille + style sur l'horloge audio. `barTimes` garde les instants réels (pour évaluer les exercices). */
export class Backing {
  readonly bus: GainNode; private buses: Buses;
  private timer: number | null = null; private nextT = 0; private seq = 0;
  barTimes: BarInfo[] = [];
  onBar?: (b: BarInfo) => void; onEnd?: () => void;
  constructor(private ctx: AudioContext, public grid: Grid, public opts: BackingOptions, dest: AudioNode = ctx.destination) {
    this.bus = masterChain(ctx, dest);
    const mk = () => { const g = ctx.createGain(); g.connect(this.bus); return g; };
    this.buses = { drums: mk(), keys: mk(), gtr: mk() };
    this.applyMute();
  }
  applyMute() {
    const { mute } = this.opts, t = this.ctx.currentTime;
    this.buses.drums.gain.setTargetAtTime(mute.drums ? 0 : 1, t, 0.01);
    this.buses.keys.gain.setTargetAtTime(mute.keys ? 0 : 0.9, t, 0.01);
    this.buses.gtr.gain.setTargetAtTime(mute.gtr ? 0 : 0.9, t, 0.01);
  }
  get running() { return this.timer !== null; }
  start(at = this.ctx.currentTime + 0.15) {
    this.stop(); this.nextT = at; this.seq = 0; this.barTimes = [];
    this.timer = window.setInterval(() => this.pump(), 30); this.pump();
  }
  stop() { if (this.timer !== null) clearInterval(this.timer); this.timer = null; }
  dispose() { this.stop(); this.bus.disconnect(); Object.values(this.buses).forEach(b => b.disconnect()); }

  /** Position (mesure de grille, tour) pour un numéro de mesure joué, hors décompte. */
  private locate(playSeq: number) {
    const { from, to } = this.opts.section ?? { from: 0, to: this.grid.bars.length - 1 };
    const len = to - from + 1;
    return { bar: from + (playSeq % len), lap: Math.floor(playSeq / len), len };
  }
  private pump() {
    const style = getStyle(this.opts.style);
    while (this.nextT < this.ctx.currentTime + 0.25) {
      const countIn = this.seq < this.opts.countIn;
      const playSeq = this.seq - this.opts.countIn;
      const { bar, lap, len } = this.locate(Math.max(0, playSeq));
      if (!countIn && this.opts.laps > 0 && lap >= this.opts.laps) { this.stop(); const wait = Math.max(0, (this.nextT - this.ctx.currentTime) * 1000); setTimeout(() => this.onEnd?.(), wait); return; }
      const bpm = this.opts.bpm + (this.opts.accelPerLap ?? 0) * (countIn ? 0 : lap);
      const bt = this.nextT, bdur = (60 / bpm) * this.grid.beatsPerBar;
      const info: BarInfo = { seq: this.seq, bar, lap, time: bt, bpm, countIn }; this.barTimes.push(info);
      if (countIn) { // clic de décompte
        for (let b = 0; b < this.grid.beatsPerBar; b++) renderEvent(this.ctx, this.buses, { t: bt + b * 60 / bpm, voice: b === 0 ? 'rim' : 'hat', dur: 0.05, vel: 1 });
      } else {
        const events = planBar(style, this.grid.bars[bar], bt, bpm, this.opts.swing);
        for (const e of events) renderEvent(this.ctx, this.buses, e);
      }
      setTimeout(() => this.onBar?.(info), Math.max(0, (bt - this.ctx.currentTime) * 1000));
      this.nextT += bdur; this.seq++; void len;
    }
  }
}
