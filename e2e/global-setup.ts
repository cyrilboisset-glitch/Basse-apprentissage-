import { mkdirSync, writeFileSync } from 'node:fs';
import { encodeWav } from '../src/audio/wav';

/** Faux micro : une basse (Mi grave 41,2 Hz, harmoniques) de 30 s, lue en boucle par Chromium. */
export default function setup() {
  mkdirSync('e2e/.tmp', { recursive: true });
  const sr = 48000, n = sr * 30, amps = [0.3, 1, 0.8, 0.5, 0.3];
  const x = Float32Array.from({ length: n }, (_, i) => 0.15 * amps.reduce((s, a, h) => s + a * Math.sin(2 * Math.PI * 41.2035 * (h + 1) * i / sr), 0));
  writeFileSync('e2e/.tmp/e1.wav', encodeWav([x], sr));
}
