import workletUrl from './pitch-worklet.ts?worker&url';

export interface PitchEvent { t: number; level: number; freq: number | null; clarity: number }
export interface LevelEvent { t: number; rms: number }
export type EngineStatus = 'idle' | 'starting' | 'running' | 'denied' | 'unavailable' | 'disconnected';

type Listener<T> = (e: T) => void;

/** Entrée audio unique : micro ou interface USB (Plug Pro), sans traitement de voix. */
class AudioEngine {
  ctx: AudioContext | null = null;
  status: EngineStatus = 'idle';
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private pitchL = new Set<Listener<PitchEvent>>();
  private levelL = new Set<Listener<LevelEvent>>();
  private statusL = new Set<(s: EngineStatus) => void>();

  onPitch(l: Listener<PitchEvent>) { this.pitchL.add(l); return () => this.pitchL.delete(l); }
  onLevel(l: Listener<LevelEvent>) { this.levelL.add(l); return () => this.levelL.delete(l); }
  onStatus(l: (s: EngineStatus) => void) { this.statusL.add(l); return () => this.statusL.delete(l); }
  private setStatus(s: EngineStatus) { this.status = s; this.statusL.forEach(l => l(s)); }

  private lastDevice?: string;
  constructor() {
    try { navigator.mediaDevices?.addEventListener?.('devicechange', () => { if (this.status === 'disconnected') this.start(this.lastDevice); }); } catch { /* hors navigateur */ }
  }

  async start(deviceId?: string): Promise<void> {
    if (this.status === 'running' || this.status === 'starting') return;
    this.lastDevice = deviceId;
    if (!navigator.mediaDevices?.getUserMedia) { this.setStatus('unavailable'); return; }
    this.setStatus('starting');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1,
        },
      });
    } catch (e) {
      const name = (e as DOMException).name;
      this.setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      return;
    }
    try {
      this.ctx ??= new AudioContext({ latencyHint: 'interactive' });
      await this.ctx.resume();
      if (!this.node) {
        await this.ctx.audioWorklet.addModule(workletUrl);
      }
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(this.ctx, 'pitch-processor', { numberOfOutputs: 0 });
      this.node.port.onmessage = ev => {
        const m = ev.data;
        if (m.type === 'pitch') this.pitchL.forEach(l => l(m));
        else if (m.type === 'level') this.levelL.forEach(l => l(m));
      };
      this.source.connect(this.node);
      this.stream.getAudioTracks().forEach(t => t.addEventListener('ended', () => { this.release(); this.setStatus('disconnected'); }));
      this.setStatus('running');
    } catch {
      this.release(); this.setStatus('unavailable');
    }
  }

  /** Libère micro et nœuds (le contexte est conservé pour le métronome et les backings). */
  private release() {
    this.node?.port.close(); this.node?.disconnect(); this.node = null;
    this.source?.disconnect(); this.source = null;
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
  }
  stop() { this.release(); if (this.status !== 'disconnected') this.setStatus('idle'); }

  async getContext(): Promise<AudioContext> {
    this.ctx ??= new AudioContext({ latencyHint: 'interactive' });
    await this.ctx.resume();
    return this.ctx;
  }
}
export const engine = new AudioEngine();

export interface InputDevice { id: string; label: string }
export async function listInputs(): Promise<InputDevice[]> {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter(d => d.kind === 'audioinput').map((d, i) => ({ id: d.deviceId, label: d.label || `Entrée ${i + 1}` }));
  } catch { return []; }
}
/** Devine l'interface USB du Plug Pro d'après le nom (les libellés Android sont souvent génériques). */
export function guessUsbInput(devs: InputDevice[]): InputDevice | undefined {
  return devs.find(d => /nux|mighty|plug/i.test(d.label)) ?? devs.find(d => /usb/i.test(d.label));
}
