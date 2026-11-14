import { useEffect, useRef, useState } from 'preact/hooks';
import { engine } from '../audio/engine';
import { db } from '../storage/db';
import { keepAwake } from './wakeLock';

const SPEEDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1];
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function AudioFile() {
  const au = useRef<HTMLAudioElement>(null); const cv = useRef<HTMLCanvasElement>(null); const [name, setName] = useState(''); const [src, setSrc] = useState(''); const [dur, setDur] = useState(0); const [t, setT] = useState(0);
  const [rate, setRate] = useState(1); const [A, setA] = useState<number | null>(null); const [B, setB] = useState<number | null>(null); const [loop, setLoop] = useState(true); const [peaks, setPeaks] = useState<number[]>([]); const [msg, setMsg] = useState(''); const key = useRef(''); const raf = useRef(0);

  useEffect(() => { const el = au.current; if (el) { el.preservesPitch = true; (el as any).mozPreservesPitch = true; (el as any).webkitPreservesPitch = true; el.playbackRate = rate; } }, [rate, src]);
  useEffect(() => { const loopFn = () => { const el = au.current; if (el) { setT(el.currentTime); if (loop && A !== null && B !== null && B > A && el.currentTime >= B) el.currentTime = A; } raf.current = requestAnimationFrame(loopFn); }; loopFn(); return () => { cancelAnimationFrame(raf.current); keepAwake(false); }; }, [loop, A, B]);
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => { if (key.current && (A !== null || B !== null)) db.kv.put({ key: 'loop:' + key.current, value: { A, B } }); }, [A, B]);

  const onFile = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    if (f.size > 80e6) { setMsg('Fichier trop volumineux (80 Mo max).'); return; }
    setMsg(''); setName(f.name); setPeaks([]); key.current = `${f.name}:${f.size}`; setSrc(URL.createObjectURL(f));
    const saved = (await db.kv.get('loop:' + key.current))?.value as { A: number | null; B: number | null } | undefined; setA(saved?.A ?? null); setB(saved?.B ?? null);
    try { const ctx = await engine.getContext(); const buf = await ctx.decodeAudioData(await f.arrayBuffer()); const d = buf.getChannelData(0), n = 600, step = Math.floor(d.length / n); setPeaks(Array.from({ length: n }, (_, i) => { let m = 0; for (let j = i * step; j < (i + 1) * step; j += 16) m = Math.max(m, Math.abs(d[j])); return m; })); } catch { setMsg('Forme d\'onde indisponible pour ce format (la lecture fonctionne).'); }
  };
  useEffect(() => { const c = cv.current; if (!c || !dur) return; const g = c.getContext('2d')!; const css = getComputedStyle(document.documentElement); g.clearRect(0, 0, c.width, c.height);
    if (A !== null && B !== null && B > A) { g.fillStyle = 'rgba(74,222,128,.25)'; g.fillRect(A / dur * c.width, 0, (B - A) / dur * c.width, c.height); }
    g.fillStyle = css.getPropertyValue('--muted') || '#94a3b8'; peaks.forEach((p, i) => { const h = Math.max(1, p * c.height * 0.9); g.fillRect(i * c.width / peaks.length, (c.height - h) / 2, Math.max(1, c.width / peaks.length - 1), h); });
    g.fillStyle = '#f87171'; g.fillRect(t / dur * c.width - 1, 0, 2, c.height); }, [peaks, A, B, t, dur]);
  const seek = (e: MouseEvent) => { const c = cv.current!, r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width; if (au.current) au.current.currentTime = x * dur; };
  return (<>
    <h1>Jouer sur un morceau</h1>
    <div class="card"><label>Fichier audio <input type="file" accept="audio/*" onChange={onFile} /></label>
      <p class="muted">Votre fichier reste sur le téléphone. Branchez le Plug Pro : le morceau et votre basse se mélangent dans le casque.</p>{msg && <p role="status">{msg}</p>}</div>
    {src && <>
      <audio ref={au} src={src} onLoadedMetadata={e => setDur((e.target as HTMLAudioElement).duration)} onPlay={() => keepAwake(true)} onPause={() => keepAwake(false)} />
      <div class="card"><b>{name}</b>
        <canvas ref={cv} width="600" height="90" style="width:100%;height:90px;background:var(--bg);border-radius:8px;cursor:pointer" onClick={seek} aria-label="Forme d'onde : touchez pour vous placer" />
        <div style="display:flex;justify-content:space-between" class="muted"><span>{mmss(t)}</span><span>A : {A === null ? '—' : mmss(A)} · B : {B === null ? '—' : mmss(B)}</span><span>{mmss(dur)}</span></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px">
          <button class="btn primary" style="min-height:64px" onClick={() => { const el = au.current!; el.paused ? el.play() : el.pause(); }}>▶ / ⏸</button>
          <button class="btn" onClick={() => { if (au.current) au.current.currentTime = A ?? 0; }}>⏮ Début de boucle</button>
          <button class="btn" onClick={() => setA(au.current!.currentTime)}>A ici</button><button class="btn" onClick={() => setB(au.current!.currentTime)}>B ici</button>
          <button class="btn" onClick={() => { setA(null); setB(null); }}>Effacer A-B</button><button class="btn" aria-pressed={loop} style={loop ? 'background:var(--accent);color:var(--on-accent)' : ''} onClick={() => setLoop(l => !l)}>Boucle A-B {loop ? 'activée' : 'coupée'}</button></div></div>
      <div class="card"><b>Vitesse (la hauteur ne change pas)</b>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:8px">{SPEEDS.map(v => <button class="btn" style={`min-height:48px;${rate === v ? 'background:var(--accent);color:var(--on-accent)' : ''}`} onClick={() => setRate(v)}>{Math.round(v * 100)}%</button>)}</div></div></>}
  </>);
}
