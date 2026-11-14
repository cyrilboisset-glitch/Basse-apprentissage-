/** Détecteur de hauteur YIN (de Cheveigné & Kawahara, 2002), sans allocation par appel. */
export interface PitchResult { freq: number; clarity: number }

export class YinDetector {
  private diff: Float32Array;
  private cmnd: Float32Array;
  private dec: Float32Array;
  private decimation: number;
  /** `decimation` : facteur de sous-échantillonnage du premier passage (rapide), puis affinage à pleine résolution. */
  constructor(public sampleRate: number, public size = 8192, public minFreq = 28, public maxFreq = 1000, public threshold = 0.15, decimation = 1) {
    this.decimation = Math.max(1, Math.floor(decimation));
    const tauMax = Math.floor(sampleRate / this.decimation / minFreq);
    this.diff = new Float32Array(tauMax + 2);
    this.cmnd = new Float32Array(tauMax + 2);
    this.dec = new Float32Array(Math.floor(size / this.decimation));
    if (this.dec.length < tauMax * 2) throw new Error('buffer trop court pour minFreq');
  }

  detect(buf: Float32Array): PitchResult | null {
    const D = this.decimation;
    if (D === 1) return this.core(buf, this.sampleRate);
    const { dec } = this;
    for (let i = 0; i < dec.length; i++) { let s = 0; for (let k = 0; k < D; k++) s += buf[i * D + k]; dec[i] = s / D; }
    const coarse = this.core(dec, this.sampleRate / D);
    return coarse ? this.refine(buf, coarse) : null;
  }

  /** Affinage : recherche locale du minimum de différence à pleine résolution. */
  private refine(buf: Float32Array, c: PitchResult): PitchResult {
    const tau0 = Math.round(this.sampleRate / c.freq);
    const W = this.size - tau0 - this.decimation - 4;
    const d = (tau: number) => { let s = 0; for (let j = 0; j < W; j++) { const e = buf[j] - buf[j + tau]; s += e * e; } return s; };
    const span = this.decimation + 1;
    let best = tau0, bv = Infinity;
    for (let t = tau0 - span; t <= tau0 + span; t++) { const v = d(t); if (v < bv) { bv = v; best = t; } }
    const a = d(best - 1), b = bv, cc = d(best + 1);
    const den = a - 2 * b + cc;
    const shift = den !== 0 ? (a - cc) / (2 * den) : 0;
    return { freq: this.sampleRate / (best + Math.max(-1, Math.min(1, shift))), clarity: c.clarity };
  }

  private core(buf: Float32Array, sampleRate: number): PitchResult | null {
    const { diff, cmnd } = this;
    const tauMax = diff.length - 2;
    const tauMin = Math.max(2, Math.floor(sampleRate / this.maxFreq));
    const W = (buf.length) - tauMax;
    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let j = 0; j < W; j++) { const d = buf[j] - buf[j + tau]; s += d * d; }
      diff[tau] = s;
    }
    cmnd[0] = 1;
    let run = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      run += diff[tau];
      cmnd[tau] = run === 0 ? 1 : (diff[tau] * tau) / run;
    }
    // Premier creux sous le seuil, puis descente jusqu'au minimum local.
    let tau = -1;
    for (let t = tauMin; t < tauMax; t++) {
      if (cmnd[t] < this.threshold) {
        while (t + 1 < tauMax && cmnd[t + 1] < cmnd[t]) t++;
        tau = t; break;
      }
    }
    if (tau < 0) return null;
    // Interpolation parabolique.
    const a = cmnd[tau - 1], b = cmnd[tau], c = cmnd[tau + 1];
    const den = a - 2 * b + c;
    const shift = den !== 0 ? (a - c) / (2 * den) : 0;
    const refined = tau + Math.max(-1, Math.min(1, shift));
    return { freq: sampleRate / refined, clarity: 1 - b };
  }
}

export function rms(buf: Float32Array, from = 0, to = buf.length): number {
  let s = 0; for (let i = from; i < to; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, to - from));
}
