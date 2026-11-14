/// <reference lib="webworker" />
import { YinDetector, rms } from './pitch';

declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor { port: MessagePort; constructor(); }
declare function registerProcessor(name: string, ctor: unknown): void;

const SIZE = 8192;
const HOP = 2048;

class PitchProcessor extends AudioWorkletProcessor {
  private ring = new Float32Array(SIZE);
  private ordered = new Float32Array(SIZE);
  private pos = 0; private sinceDetect = 0; private sinceRms = 0; private rmsAcc = 0; private rmsN = 0;
  private det = new YinDetector(sampleRate, SIZE, 28, 1000, 0.15, 4);
  private minRms = 0.003;

  process(inputs: Float32Array[][]): boolean {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.ring[this.pos] = ch[i]; this.pos = (this.pos + 1) % SIZE;
      this.rmsAcc += ch[i] * ch[i]; this.rmsN++;
    }
    this.sinceDetect += ch.length; this.sinceRms += ch.length;
    if (this.sinceRms >= 480) { // ~10 ms : enveloppe pour la détection d'attaques
      this.port.postMessage({ type: 'level', t: currentTime, rms: Math.sqrt(this.rmsAcc / this.rmsN) });
      this.rmsAcc = 0; this.rmsN = 0; this.sinceRms = 0;
    }
    if (this.sinceDetect >= HOP) {
      this.sinceDetect = 0;
      const { ring, ordered, pos } = this;
      ordered.set(ring.subarray(pos), 0); ordered.set(ring.subarray(0, pos), SIZE - pos);
      const level = rms(ordered, SIZE - 2048, SIZE);
      const r = level >= this.minRms ? this.det.detect(ordered) : null;
      this.port.postMessage({ type: 'pitch', t: currentTime, level, freq: r?.freq ?? null, clarity: r?.clarity ?? 0 });
    }
    return true;
  }
}
registerProcessor('pitch-processor', PitchProcessor);
