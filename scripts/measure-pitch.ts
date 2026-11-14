/**
 * Mesure le taux de reconnaissance du détecteur sur vos fichiers WAV nommés d'après la note (E1.wav, F#2.wav, Bb1.wav…).
 * Usage : npm run measure -- [dossier]     (défaut : tests/audio ; mettez vos propres enregistrements dans un autre dossier)
 */
import { measureFolder } from './measure-lib';

const rows = measureFolder(process.argv[2] ?? 'tests/audio');
for (const r of rows) console.log(`${r.file.padEnd(10)} attendu ${r.expectedHz.toFixed(2).padStart(7)} Hz  mesuré ${r.hz ? r.hz.toFixed(2).padStart(7) : '    —  '} Hz  écart ${r.cents === null ? '   —' : r.cents.toFixed(1).padStart(5)} c  ${r.ok ? 'OK' : 'ÉCHEC'}`);
const ok = rows.filter(r => r.ok).length, e = rows.filter(r => r.cents !== null).map(r => Math.abs(r.cents!));
console.log(`\nTaux de reconnaissance (±5 cents) : ${ok}/${rows.length} = ${(100 * ok / Math.max(1, rows.length)).toFixed(1)} %` + (e.length ? ` · écart moyen ${(e.reduce((a, b) => a + b, 0) / e.length).toFixed(2)} cents · max ${Math.max(...e).toFixed(2)} cents` : ''));
