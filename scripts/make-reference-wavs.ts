/** Génère tests/audio/<NOTE>.wav : 45 notes de basse (B0 → G4), 48 kHz, 16 bits, 0,45 s.  Usage : npm run wavs */
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodeWav } from '../src/audio/wav';
import { midiToFreq } from '../src/audio/notes';
import { noteName, pluck } from './synth';

mkdirSync('tests/audio', { recursive: true });
for (let m = 23; m <= 67; m++) writeFileSync(`tests/audio/${noteName(m)}.wav`, encodeWav([pluck(midiToFreq(m), m < 28)], 48000));
console.log('45 fichiers écrits dans tests/audio/');
