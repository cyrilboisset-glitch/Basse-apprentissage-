import type { PlanEvent } from './plan';
import { midiToFreq } from '../notes';

export interface Buses { drums: GainNode; keys: GainNode; gtr: GainNode }
const noise = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuf(ctx: BaseAudioContext) {
  let b = noise.get(ctx);
  if (!b) { b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noise.set(ctx, b); }
  return b;
}
function env(ctx: BaseAudioContext, dest: AudioNode, t: number, peak: number, dur: number, attack = 0.002): GainNode {
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(dest); return g;
}
function tidy(src: AudioScheduledSourceNode, ...nodes: AudioNode[]) { src.onended = () => { src.disconnect(); nodes.forEach(n => n.disconnect()); }; }

function noiseHit(ctx: BaseAudioContext, dest: AudioNode, t: number, dur: number, vel: number, type: BiquadFilterType, freq: number) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf(ctx);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = env(ctx, dest, t, vel * 0.5, dur);
  src.connect(f).connect(g); src.start(t, Math.random() * 0.5, dur + 0.02); tidy(src, f, g);
}
function toneHit(ctx: BaseAudioContext, dest: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, dur: number, vel: number) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
  const g = env(ctx, dest, t, vel, dur); o.connect(g); o.start(t); o.stop(t + dur + 0.02); tidy(o, g);
}

export function renderEvent(ctx: BaseAudioContext, b: Buses, e: PlanEvent) {
  const { t, vel } = e;
  switch (e.voice) {
    case 'kick': toneHit(ctx, b.drums, t, 'sine', 150, 45, 0.22, vel); break;
    case 'snare': noiseHit(ctx, b.drums, t, 0.18, vel, 'bandpass', 1800); toneHit(ctx, b.drums, t, 'triangle', 220, 160, 0.1, vel * 0.5); break;
    case 'ghost': noiseHit(ctx, b.drums, t, 0.06, vel, 'bandpass', 1800); break;
    case 'hat': noiseHit(ctx, b.drums, t, 0.045, vel, 'highpass', 7500); break;
    case 'hatOpen': noiseHit(ctx, b.drums, t, 0.25, vel, 'highpass', 7000); break;
    case 'ride': noiseHit(ctx, b.drums, t, 0.3, vel * 0.7, 'highpass', 5500); toneHit(ctx, b.drums, t, 'triangle', 1100, 1050, 0.2, vel * 0.15); break;
    case 'rim': toneHit(ctx, b.drums, t, 'triangle', 900, 700, 0.04, vel * 0.6); break;
    case 'tamb': noiseHit(ctx, b.drums, t, 0.05, vel * 0.6, 'bandpass', 6500); break;
    case 'keys': for (const m of e.midi ?? []) {
      const f = midiToFreq(m), g = env(ctx, b.keys, t, vel * 0.12, e.dur + 0.15, 0.006);
      for (const [type, mult] of [['sine', 1], ['triangle', 2]] as const) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mult; o.connect(g); o.start(t); o.stop(t + e.dur + 0.2); tidy(o); }
      setTimeout(() => g.disconnect(), (t - ctx.currentTime + e.dur + 0.5) * 1000);
    } break;
    case 'organ': for (const m of e.midi ?? []) {
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel * 0.06, t + 0.02); g.gain.setValueAtTime(vel * 0.06, t + e.dur - 0.05); g.gain.linearRampToValueAtTime(0.0001, t + e.dur); g.connect(b.keys);
      for (const mult of [1, 2, 3]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midiToFreq(m) * mult; const og = ctx.createGain(); og.gain.value = 1 / mult; o.connect(og).connect(g); o.start(t); o.stop(t + e.dur); tidy(o, og); }
      setTimeout(() => g.disconnect(), (t - ctx.currentTime + e.dur + 0.3) * 1000);
    } break;
    case 'gtr': {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(b.gtr);
      const g = env(ctx, lp, t, vel * 0.09, Math.min(e.dur + 0.1, 0.5), 0.003);
      (e.midi ?? []).forEach((m, i) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiToFreq(m + 12); o.detune.value = i * 3 - 3; o.connect(g); o.start(t + i * 0.008); o.stop(t + e.dur + 0.15); tidy(o); });
      setTimeout(() => { g.disconnect(); lp.disconnect(); }, (t - ctx.currentTime + e.dur + 0.5) * 1000);
    } break;
  }
}

/** Basse synthétisée (phrases « question » et exemples) : scie filtrée + sinus sub. */
export function playBassNote(ctx: BaseAudioContext, dest: AudioNode, t: number, midi: number, dur: number, vel = 0.8) {
  const f = midiToFreq(midi);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(250, t + dur);
  const g = env(ctx, dest, t, vel * 0.4, dur, 0.006); lp.connect(g);
  for (const [type, mult, gain] of [['sawtooth', 1, 0.5], ['sine', 1, 0.9]] as const) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mult; const og = ctx.createGain(); og.gain.value = gain;
    o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 0.05); tidy(o, og);
  }
  setTimeout(() => { g.disconnect(); lp.disconnect(); }, (t - ctx.currentTime + dur + 0.3) * 1000);
}

/** Chaîne maître : niveau de sécurité + limiteur, pour ne jamais saturer. */
export function masterChain(ctx: BaseAudioContext, dest: AudioNode): GainNode {
  const input = ctx.createGain(); input.gain.value = 0.5;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -8; lim.knee.value = 4; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
  input.connect(lim).connect(dest); return input;
}
