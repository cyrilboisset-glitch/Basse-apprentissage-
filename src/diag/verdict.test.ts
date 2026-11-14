import { describe, expect, it } from 'vitest';
import { judgeAudio, judgeEnv, judgeInputs, toDb, worst, type EnvInfo } from './verdict';

const st = (o: Partial<Parameters<typeof judgeAudio>[0]> = {}) => ({ seconds: 5, levels: Array(50).fill(0.0005), peak: 0.0006, pitchEvents: 100, detected: 0, ...o });
const has = (fs: ReturnType<typeof judgeAudio>, t: RegExp, level?: string) => fs.some(f => t.test(f.title) && (!level || f.level === level));
describe('diagnostic audio', () => {
  it('toDb', () => { expect(toDb(1)).toBe(0); expect(toDb(0.1)).toBe(-20); expect(toDb(0)).toBe(-120); });
  it('worklet muet = échec', () => expect(has(judgeAudio(st({ pitchEvents: 0 }), false), /ne répond pas/, 'fail')).toBe(true));
  it('silence propre', () => expect(has(judgeAudio(st(), false), /Silence propre/, 'ok')).toBe(true));
  it('bruit de fond élevé', () => expect(has(judgeAudio(st({ levels: Array(50).fill(0.05) }), false), /Bruit de fond/, 'warn')).toBe(true));
  it('on ne juge pas le niveau si rien n’a été joué', () => expect(has(judgeAudio(st(), false), /signal|Niveau/i)).toBe(false));
  it('rien reçu pendant le jeu', () => expect(has(judgeAudio(st(), true), /Aucun signal/, 'fail')).toBe(true));
  it('signal faible', () => expect(has(judgeAudio(st({ levels: [...Array(40).fill(0.0005), ...Array(10).fill(0.015)] }), true), /trop faible/, 'warn')).toBe(true));
  it('saturation', () => expect(has(judgeAudio(st({ levels: [...Array(40).fill(0.0005), ...Array(10).fill(0.5)], peak: 1 }), true), /Saturation/, 'warn')).toBe(true));
  it('bon niveau + notes reconnues', () => {
    const f = judgeAudio(st({ levels: [...Array(40).fill(0.0005), ...Array(10).fill(0.2)], peak: 0.5, detected: 60 }), true);
    expect(has(f, /Niveau correct/, 'ok') && has(f, /Notes reconnues/, 'ok')).toBe(true); expect(worst(f)).toBe('ok');
  });
  it('signal présent mais notes non reconnues', () => expect(has(judgeAudio(st({ levels: [...Array(40).fill(0.0005), ...Array(10).fill(0.2)], peak: 0.5, detected: 0 }), true), /peu reconnues/, 'warn')).toBe(true));
});
describe('diagnostic environnement', () => {
  const base: EnvInfo = { secure: true, getUserMedia: true, audioContext: true, audioWorklet: true, bluetooth: true, wakeLock: true, indexedDB: true, serviceWorker: true, standalone: false, ua: 'Chrome Android' };
  it('tout est bon', () => expect(worst(judgeEnv(base))).toBe('ok'));
  it('iPhone : Bluetooth = avertissement qui explique, pas un échec', () => {
    const f = judgeEnv({ ...base, bluetooth: false, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }); const b = f.find(x => /Bluetooth/.test(x.title))!;
    expect(b.level).toBe('warn'); expect(b.detail).toMatch(/iPhone/); expect(worst(f)).toBe('warn');
  });
  it('HTTP = échec', () => expect(worst(judgeEnv({ ...base, secure: false }))).toBe('fail'));
});

describe('diagnostic entrées', () => {
  it('seulement le micro intégré en mode USB = échec explicite', () => { const f = judgeInputs(['Par défaut', 'Speakerphone'], true); expect(f[0].level).toBe('fail'); expect(f[0].detail).toMatch(/micro de l'appareil/); });
  it('interface NUX détectée', () => expect(judgeInputs(['Par défaut', 'NUX MIGHTY PLUG PRO'], true)[0].level).toBe('ok'));
  it('interface détectée mais autre entrée choisie : on le dit', () => expect(judgeInputs(['Speakerphone', 'USB Audio'], true, 'Speakerphone')[0].detail).toMatch(/pas l'entrée choisie/));
  it('mode Bluetooth : pas de reproche', () => expect(judgeInputs(['Par défaut', 'Speakerphone'], false)).toEqual([]));
});
