import { freqToMidi } from './notes';

export interface NoteEvent { t: number; midi: number | null; freq?: number; level: number }
interface Pitch { t: number; freq: number | null; clarity: number; level: number }

/**
 * Transforme les flux « niveau » (10 ms) et « hauteur » (43 ms) en événements de notes :
 *  - l'instant `t` vient de l'attaque (précis, pour le rythme) ;
 *  - la hauteur vient de deux trames consécutives concordantes, au moins 100 ms après l'attaque
 *    (la fenêtre de 170 ms contient sinon encore la note précédente) ;
 *  - une attaque sans hauteur claire sous 450 ms devient une note « étouffée » (midi = null).
 */
export class NoteTracker {
  private avg = 0; private pending: number | null = null; private lastOnset = -1;
  private cand: number | null = null; private candN = 0; private lastMidi: number | null = null;
  constructor(private cb: (e: NoteEvent) => void, public refA = 440, private minLevel = 0.01) {}

  feedLevel(t: number, rms: number) {
    if (rms > this.minLevel && rms > this.avg * 2.5 && t - this.lastOnset > 0.08) {
      if (this.pending !== null) this.flush(null, 0);
      this.pending = t; this.lastOnset = t; this.cand = null; this.candN = 0;
    }
    this.avg = this.avg * 0.9 + rms * 0.1;
    if (this.pending !== null && t - this.pending > 0.45) this.flush(null, rms);
  }

  feedPitch(p: Pitch) {
    if (p.freq === null || p.clarity < 0.8) { this.cand = null; this.candN = 0; return; }
    const midi = Math.round(freqToMidi(p.freq, this.refA));
    if (this.pending !== null && p.t < this.pending + 0.1) return;
    this.candN = this.cand === midi ? this.candN + 1 : 1; this.cand = midi;
    if (this.candN < 2) return;
    if (this.pending !== null) { this.flush(midi, p.level, p.freq); this.lastMidi = midi; }
    else if (midi !== this.lastMidi) { // changement de hauteur sans attaque (legato, hammer-on)
      this.cb({ t: p.t - 0.1, midi, freq: p.freq, level: p.level }); this.lastMidi = midi;
    }
  }

  private flush(midi: number | null, level: number, freq?: number) {
    if (this.pending === null) return;
    this.cb({ t: this.pending, midi, freq, level }); this.pending = null;
    if (midi === null) this.lastMidi = null;
  }
}
