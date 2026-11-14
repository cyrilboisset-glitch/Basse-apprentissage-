import { describe, it, expect } from 'vitest';
import { scaleNotes, SCALES } from './scales';
import { parseChord, chordNotes, noteRole, parseRoot } from './chords';
import { parseGrid, progressionToGrid, romanToChord } from './grid';
import { positionsOfPc, allPositions, scalePosition } from './fretboard';

describe('gammes', () => {
  it('Do majeur', () => expect(scaleNotes(0, 'major')).toEqual([0, 2, 4, 5, 7, 9, 11]));
  it('La pentatonique mineure = La Do Ré Mi Sol', () => expect(scaleNotes(9, 'minorPent')).toEqual([9, 0, 2, 4, 7]));
  it('chaque gamme commence sur 0 et est croissante', () => {
    for (const s of SCALES) { expect(s.steps[0]).toBe(0); expect([...s.steps].sort((a, b) => a - b)).toEqual(s.steps); }
  });
  it('les 7 modes sont des rotations de la majeure', () => {
    const maj = SCALES[0].steps;
    ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'].forEach((id, k) => {
      const rot = maj.map(x => (x - maj[k] + 12) % 12).sort((a, b) => a - b);
      expect(SCALES.find(s => s.id === id)!.steps).toEqual(rot);
    });
  });
});
describe('accords', () => {
  it('Am7 = La Do Mi Sol', () => expect(chordNotes(parseChord('Am7')!)).toEqual([9, 0, 4, 7]));
  it('Gmaj7, D7, Bm7b5, F#dim7, Csus4, A6, Bb', () => {
    expect(chordNotes(parseChord('Gmaj7')!)).toEqual([7, 11, 2, 6]);
    expect(chordNotes(parseChord('D7')!)).toEqual([2, 6, 9, 0]);
    expect(chordNotes(parseChord('Bm7b5')!)).toEqual([11, 2, 5, 9]);
    expect(chordNotes(parseChord('F#dim7')!)).toEqual([6, 9, 0, 3]);
    expect(chordNotes(parseChord('Csus4')!)).toEqual([0, 5, 7]);
    expect(chordNotes(parseChord('A6')!)).toEqual([9, 1, 4, 6]);
    expect(parseChord('Bb')!.root).toBe(10);
  });
  it('noms français et slash', () => { expect(parseRoot('Sol#m')!.pc).toBe(8); expect(parseChord('C/E')!.bass).toBe(4); });
  it('rejette les symboles inconnus', () => { expect(parseChord('Hx')).toBeNull(); expect(parseChord('Cfoo')).toBeNull(); });
  it('fonction des notes sur D7', () => {
    const c = parseChord('D7')!;
    expect(noteRole(2, c)).toBe('root'); expect(noteRole(6, c)).toBe('third'); expect(noteRole(9, c)).toBe('fifth');
    expect(noteRole(0, c)).toBe('seventh'); expect(noteRole(4, c)).toBe('extension'); // 9e
    expect(noteRole(7, c)).toBe('avoid'); // 4te sur dominante
    expect(noteRole(3, c)).toBe('passing'); // D#
  });
  it('sur Am7 : Fa (b6) à éviter, Si extension', () => {
    const c = parseChord('Am7')!;
    expect(noteRole(5, c)).toBe('avoid'); expect(noteRole(11, c)).toBe('extension');
  });
});
describe('grilles', () => {
  it('parse « Am7 | D7 | Gmaj7 | Gmaj7 »', () => {
    const g = parseGrid('Am7 | D7 | Gmaj7 | Gmaj7')!;
    expect(g.bars.length).toBe(4); expect(g.bars[1][0].chord.symbol).toBe('D7');
  });
  it('deux accords par mesure se partagent les temps ; % répète', () => {
    const g = parseGrid('C Am | %')!;
    expect(g.bars[0].map(x => x.beats)).toEqual([2, 2]); expect(g.bars[1][0].chord.symbol).toBe('C');
  });
  it('refuse un accord invalide', () => expect(parseGrid('Am7 | Zz')).toBeNull());
  it('II-V-I en Do', () => expect(progressionToGrid('ii7 | V7 | Imaj7', 'C')!.bars.map(b => b[0].chord.symbol)).toEqual(['Dm7', 'G7', 'Cmaj7']));
  it('blues en Fa, bVII', () => {
    expect(progressionToGrid('I7 | IV7 | V7', 'F')!.bars.map(b => b[0].chord.symbol)).toEqual(['F7', 'Bb7', 'C7']);
    expect(romanToChord('bVII', 0)).toBe('Bb');
  });
});
describe('manche', () => {
  const tun = [28, 33, 38, 43];
  it('Mi (pc 4) cases 0-12 : 5 positions', () => {
    expect(positionsOfPc(tun, 12, 4).map(p => `${p.string}:${p.fret}`)).toEqual(['0:0', '0:12', '1:7', '2:2', '3:9']);
  });
  it('24 cases × 4 cordes = 100 positions', () => expect(allPositions(tun, 24).length).toBe(100));
  it('position de la pentatonique mineure de Mi (cases 0-3) = Mi Sol La Si Ré', () => {
    const notes = new Set(scalePosition(tun, 4, [0, 3, 5, 7, 10], 0, 3).map(p => p.midi % 12));
    expect([...notes].sort((a, b) => a - b)).toEqual([2, 4, 7, 9, 11]);
  });
});
import { formatSymbol } from './chords';
describe('affichage français des accords', () => {
  it('Bbm7 → Sibm7, F#7 → Fa#7, C/E → Do/Mi', () => {
    expect(formatSymbol('Bbm7', 'fr')).toBe('Sibm7'); expect(formatSymbol('F#7', 'fr')).toBe('Fa#7'); expect(formatSymbol('C/E', 'fr')).toBe('Do/Mi');
    expect(formatSymbol('Am7', 'en')).toBe('Am7');
  });
});
