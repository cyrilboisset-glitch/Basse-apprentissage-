import { readFileSync } from 'node:fs';
/** Lecteur WAV minimal (PCM 16 bits ou flottant 32 bits, mono ou multi-canaux → premier canal). */
export function readWav(path: string): { samples: Float32Array; sampleRate: number } {
  const b = readFileSync(path), v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${path} : pas un fichier WAV`);
  let o = 12, fmt = { tag: 1, ch: 1, rate: 48000, bits: 16 }, data: [number, number] | null = null;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), size = v.getUint32(o + 4, true);
    if (id === 'fmt ') fmt = { tag: v.getUint16(o + 8, true), ch: v.getUint16(o + 10, true), rate: v.getUint32(o + 12, true), bits: v.getUint16(o + 22, true) };
    if (id === 'data') { data = [o + 8, Math.min(size, b.length - o - 8)]; break; }
    o += 8 + size + (size & 1);
  }
  if (!data) throw new Error(`${path} : chunk data introuvable`);
  const bytes = fmt.bits / 8, n = Math.floor(data[1] / (bytes * fmt.ch)), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = data[0] + i * bytes * fmt.ch; out[i] = fmt.tag === 3 ? v.getFloat32(p, true) : fmt.bits === 16 ? v.getInt16(p, true) / 32768 : fmt.bits === 24 ? ((v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16)) / 8388608) : (v.getUint8(p) - 128) / 128; }
  return { samples: out, sampleRate: fmt.rate };
}
