import { engine } from './engine';
import { masterChain } from './backing/voices';

export const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));

/** Enregistre la basse (entrée) et, au choix, l'accompagnement. La basse n'est jamais renvoyée aux haut-parleurs. */
export class Recorder {
  readonly dest: MediaStreamAudioDestinationNode; readonly mix: GainNode; private bus: GainNode;
  private mr: MediaRecorder | null = null; private chunks: Blob[] = []; private off: (() => void) | null = null; startedAt = 0;
  constructor(private ctx: AudioContext, includeBacking: boolean) {
    this.dest = ctx.createMediaStreamDestination(); this.mix = ctx.createGain(); this.mix.connect(ctx.destination);
    this.bus = masterChain(ctx, this.dest); // limiteur : basse + accompagnement ne saturent pas l'enregistrement
    if (includeBacking) this.mix.connect(this.bus);
  }
  start(): boolean {
    const mime = pickMime(); if (typeof MediaRecorder === 'undefined') return false;
    this.off = engine.tapInput(this.bus);
    this.mr = new MediaRecorder(this.dest.stream, mime ? { mimeType: mime } : undefined);
    this.mr.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
    this.startedAt = this.ctx.currentTime; this.mr.start(1000); return true;
  }
  stop(): Promise<{ blob: Blob; mime: string; duration: number } | null> {
    return new Promise(res => {
      const mr = this.mr; if (!mr || mr.state === 'inactive') { res(null); return; }
      mr.onstop = () => { const mime = mr.mimeType || 'audio/webm'; res({ blob: new Blob(this.chunks, { type: mime }), mime, duration: this.ctx.currentTime - this.startedAt }); };
      mr.stop();
    });
  }
  dispose() { this.off?.(); this.off = null; try { this.mix.disconnect(); this.bus.disconnect(); this.dest.disconnect(); } catch { /* déjà libéré */ } this.chunks = []; }
}

/** Décode un enregistrement et le convertit en WAV. */
export async function blobToWav(blob: Blob, ctx: BaseAudioContext): Promise<Blob> {
  const { encodeWav } = await import('./wav');
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const wav = encodeWav(Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)), buf.sampleRate);
  return new Blob([wav as BlobPart], { type: 'audio/wav' });
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); Object.assign(document.createElement('a'), { href: url, download: name }).click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
