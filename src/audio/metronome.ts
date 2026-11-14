export interface MetronomeOptions {
  bpm: number; beatsPerBar: number; subdivision: 1 | 2 | 3 | 4; accent: boolean;
  /** Pour « clic qui disparaît » : sur N mesures, seules les M premières sonnent. */
  muteBars?: { play: number; of: number };
}
export const defaultMetronome: MetronomeOptions = { bpm: 80, beatsPerBar: 4, subdivision: 1, accent: true };

/** Métronome à anticipation (lookahead) : précis car planifié sur l'horloge audio. */
export class Metronome {
  private timer: number | null = null;
  private next = 0; private tick = 0;
  constructor(private ctx: AudioContext, public opts: MetronomeOptions = { ...defaultMetronome },
              private onBeat?: (beat: number, time: number, sub: number) => void,
              private dest: AudioNode = ctx.destination) {}

  start(at = this.ctx.currentTime + 0.1) {
    this.stop(); this.next = at; this.tick = 0;
    this.timer = window.setInterval(() => this.schedule(), 25); this.schedule();
  }
  stop() { if (this.timer !== null) clearInterval(this.timer); this.timer = null; }
  get running() { return this.timer !== null; }

  private schedule() {
    while (this.next < this.ctx.currentTime + 0.15) {
      const { bpm, beatsPerBar, subdivision, accent, muteBars } = this.opts;
      const perBar = beatsPerBar * subdivision;
      const inBar = this.tick % perBar, bar = Math.floor(this.tick / perBar);
      const beat = Math.floor(inBar / subdivision), sub = inBar % subdivision;
      const audible = !muteBars || bar % muteBars.of < muteBars.play;
      if (audible) this.click(this.next, sub === 0 ? (beat === 0 && accent ? 1500 : 1000) : 700, sub === 0 ? 0.9 : 0.4);
      this.onBeat?.(beat, this.next, sub);
      this.next += 60 / bpm / subdivision; this.tick++;
    }
  }
  private click(t: number, freq: number, gain: number) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = freq; o.type = 'square';
    g.gain.setValueAtTime(gain * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(this.dest); o.start(t); o.stop(t + 0.06);
    o.onended = () => { o.disconnect(); g.disconnect(); }; // évite l'accumulation de nœuds
  }
}
