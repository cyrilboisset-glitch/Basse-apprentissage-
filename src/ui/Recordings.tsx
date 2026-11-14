import { useEffect, useRef, useState } from 'preact/hooks';
import { db, type Recording } from '../storage/db';
import { blobToWav, download } from '../audio/recorder';
import { engine } from '../audio/engine';
import { midiName } from '../audio/notes';
import type { Settings } from '../storage/settings';
import { Icon } from './Icon';
import { formatSymbol } from '../theory/chords';

export function Recordings({ s }: { s: Settings }) {
  const [list, setList] = useState<Recording[]>([]); const [sel, setSel] = useState<Recording | null>(null); const [msg, setMsg] = useState('');
  const reload = () => db.recordings.orderBy('date').reverse().toArray().then(setList);
  useEffect(() => { reload(); }, []);
  if (sel) return <Player s={s} rec={sel} onExit={() => setSel(null)} />;
  const safe = (r: Recording) => `${r.name.replace(/[^\w-]+/g, '_')}`;
  return (<>
    <h1>Mes enregistrements</h1>
    {list.length === 0 && <p class="muted">Aucun enregistrement. Activez « Enregistrer » dans le Jam.</p>}
    {list.map(r => <div class="card"><b>{r.name}</b><div class="muted">{r.date} · {Math.round(r.duration)} s · {r.withBacking ? 'basse + accompagnement' : 'basse seule'} · {r.notes.length} notes</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px">
        <button class="btn" onClick={() => setSel(r)}><Icon name="play" size={18} />Réécouter</button>
        <button class="btn" onClick={() => download(r.blob, `${safe(r)}.${r.mime.includes('mp4') ? 'm4a' : r.mime.includes('ogg') ? 'ogg' : 'webm'}`)}>Exporter WebM</button>
        <button class="btn" onClick={async () => { setMsg('Conversion en WAV…'); try { download(await blobToWav(r.blob, await engine.getContext()), `${safe(r)}.wav`); setMsg(''); } catch { setMsg('Conversion WAV impossible sur ce navigateur : utilisez l\'export WebM.'); } }}>Exporter WAV</button>
        <button class="btn" style="border-color:var(--danger)" onClick={async () => { await db.recordings.delete(r.id!); reload(); }}>Supprimer</button></div></div>)}
    <p role="status" class="muted">{msg}</p>
    <p class="muted">Les enregistrements restent sur ce téléphone ; l'export JSON des réglages ne les contient pas (fichiers volumineux) : exportez-les un par un.</p>
  </>);
}

function Player({ s, rec, onExit }: { s: Settings; rec: Recording; onExit: () => void }) {
  const url = useRef(URL.createObjectURL(rec.blob)); const au = useRef<HTMLAudioElement>(null); const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0); const raf = useRef(0);
  useEffect(() => { const loop = () => { setT(au.current?.currentTime ?? 0); raf.current = requestAnimationFrame(loop); }; loop(); return () => { cancelAnimationFrame(raf.current); URL.revokeObjectURL(url.current); }; }, []);
  const PX = 60, H = 200, lo = 26, hi = 62, y = (m: number) => H - 10 - ((Math.max(lo, Math.min(hi, m)) - lo) / (hi - lo)) * (H - 40), W = Math.max(320, rec.duration * PX + 40);
  const play = rec.bars.filter(b => !b.countIn); const cur = [...play].reverse().find(b => b.time <= t); const curChord = cur ? rec.chords[cur.bar] : '';
  const lastNote = [...rec.notes].reverse().find(n => n.t <= t);
  useEffect(() => { if (box.current && !au.current?.paused) box.current.scrollLeft = Math.max(0, t * PX - 120); }, [t]);
  return (<>
    <button class="btn" style="min-height:44px" onClick={onExit}>← Retour</button><h1>{rec.name}</h1>
    <audio ref={au} src={url.current} controls style="width:100%" />
    <div class="card" style="text-align:center" aria-live="polite"><div class="muted">Accord</div><div style="font-size:2.6rem;font-weight:800">{curChord ? curChord.split(' ').map(c => formatSymbol(c, s.notation)).join('  ') : '—'}</div>
      <div class="muted">Dernière note détectée : <b>{lastNote ? `${midiName(lastNote.midi, s.notation).name}${midiName(lastNote.midi).octave}` : '—'}</b></div></div>
    <div ref={box} style="overflow-x:auto;background:var(--panel);border-radius:12px"><svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Notes détectées et grille">
      {play.map(b => <g><line x1={b.time * PX} x2={b.time * PX} y1="0" y2={H} stroke="var(--border)" /><text x={b.time * PX + 4} y="14" font-size="12" fill="var(--muted)">{(rec.chords[b.bar] ?? '').split(' ').map(c => formatSymbol(c, s.notation)).join(' ')}</text></g>)}
      {rec.notes.map(n => <rect x={n.t * PX} y={y(n.midi) - 5} width="16" height="10" rx="3" fill={cur && n.t >= cur.time ? 'var(--accent)' : '#8FB8DC'} />)}
      <line x1={t * PX} x2={t * PX} y1="0" y2={H} stroke="var(--danger)" stroke-width="2" /></svg></div>
    <p class="muted">Rectangles : notes détectées (hauteur = note). Lignes verticales : changements de mesure avec l'accord.</p>
  </>);
}
