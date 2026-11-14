import { describe, it, expect } from 'vitest';
import { NoteTracker, type NoteEvent } from './noteTracker';
import { midiToFreq } from './notes';

function run(notes: { at: number; midi: number | null }[]) {
  const out: NoteEvent[] = []; const tr = new NoteTracker(e => out.push(e));
  for (let t = 0; t < 4; t += 0.01) {
    let env = 0.0005;
    for (const n of notes) if (t >= n.at) env = 0.3 * Math.exp(-(t - n.at) * 5);
    tr.feedLevel(t, env);
    if (Math.abs(t / 0.0426 - Math.round(t / 0.0426)) < 0.12) {
      const cur = [...notes].reverse().find(n => n.at + 0.08 <= t);
      tr.feedPitch({ t, freq: cur?.midi ? midiToFreq(cur.midi) : null, clarity: cur?.midi ? 0.95 : 0, level: env });
    }
  }
  return out;
}
describe('NoteTracker', () => {
  it("date la note à l'attaque et la nomme par sa hauteur", () => {
    const ev = run([{ at: 0.5, midi: 40 }, { at: 1.0, midi: 45 }, { at: 1.5, midi: 45 }]);
    expect(ev.map(e => e.midi)).toEqual([40, 45, 45]);
    expect(Math.abs(ev[0].t - 0.5)).toBeLessThan(0.03);
  });
  it('signale une note étouffée sans hauteur', () => {
    const ev = run([{ at: 0.5, midi: 40 }, { at: 1.0, midi: null }]);
    expect(ev.map(e => e.midi)).toEqual([40, null]);
  });
});
