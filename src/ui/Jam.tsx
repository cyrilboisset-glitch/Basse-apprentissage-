import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { engine } from '../audio/engine';
import { Backing, type BackingOptions, type BarInfo } from '../audio/backing/Backing';
import { getStyle, STYLES } from '../audio/backing/styles';
import { GRID_PRESETS, parseAnyGrid, progressionToGrid, type Grid } from '../theory/grid';
import { formatSymbol } from '../theory/chords';
import { keepAwake } from './wakeLock';
import { applyPresetFor, BACKING_CATEGORY } from '../nux/presets';
import { useOnDisconnect } from './useEngine';
import { Recorder } from '../audio/recorder';
import { db } from '../storage/db';
import { useNotes } from './useNotes';
import { useRemote } from './useRemote';
import { today } from '../storage/stats';

export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const sel = (e: Event) => (e.target as HTMLSelectElement).value;

/** Texte d'une grille (degrés ou accords) → Grid ; renvoie null si invalide. */
export function gridFromPreset(id: string, key: string): Grid | null {
  const p = GRID_PRESETS.find(g => g.id === id); return p ? progressionToGrid(p.romans, key) : null;
}

export function Jam({ s }: { s: Settings }) {
  const [styleId, setStyleId] = useState('blues-shuffle');
  const st = getStyle(styleId);
  const [key, setKey] = useState(st.defaultKey); const [bpm, setBpm] = useState(st.bpm); const [swing, setSwing] = useState(st.swing);
  const [gridId, setGridId] = useState(st.defaultGrid); const [custom, setCustom] = useState('');
  const [laps, setLaps] = useState(4); const [accel, setAccel] = useState(0); const [countIn, setCountIn] = useState(true);
  const [mute, setMute] = useState({ drums: false, keys: false, gtr: false });
  const [loopOn, setLoopOn] = useState(false); const [loopFrom, setLoopFrom] = useState(1); const [loopTo, setLoopTo] = useState(4);
  const [on, setOn] = useState(false); const [cur, setCur] = useState<BarInfo | null>(null);
  const [err, setErr] = useState('');
  const bk = useRef<Backing | null>(null);
  const [rec, setRec] = useState<'off' | 'bass' | 'mix'>('off'); const recorder = useRef<Recorder | null>(null); const recNotes = useRef<{ t: number; midi: number }[]>([]); const [recMsg, setRecMsg] = useState('');
  useNotes(on && rec !== 'off', s.refA, e => { if (e.midi !== null) recNotes.current.push({ t: e.t, midi: e.midi }); }, s.inputDeviceId);

  const grid = gridId === 'custom' ? parseAnyGrid(custom, key) : gridFromPreset(gridId, key);
  useEffect(() => () => { bk.current?.dispose(); keepAwake(false); }, []);
  useEffect(() => { if (bk.current) { bk.current.opts.mute = mute; bk.current.applyMute(); } }, [mute]);
  useEffect(() => { if (bk.current) bk.current.opts.bpm = bpm; }, [bpm]);
  useEffect(() => { if (bk.current) bk.current.opts.swing = swing; }, [swing]);

  const changeStyle = (id: string) => { const n = getStyle(id); setStyleId(id); setBpm(n.bpm); setSwing(n.swing); setKey(n.defaultKey); setGridId(n.defaultGrid); };
  const finishRec = async (b: Backing | null) => {
    const r = recorder.current; recorder.current = null; if (!r) return;
    const out = await r.stop(); const t0 = r.startedAt; r.dispose(); engine.stop();
    if (!out || !b || !grid) { setRecMsg('Enregistrement vide.'); return; }
    await db.recordings.add({ date: today(), name: `Jam ${getStyle(styleId).name} ${key} ${bpm} BPM`, mime: out.mime, duration: out.duration, blob: out.blob, notes: recNotes.current.map(n => ({ t: n.t - t0, midi: n.midi })).filter(n => n.t >= 0),
      bars: b.barTimes.map(x => ({ time: x.time - t0, bar: x.bar, bpm: x.bpm, countIn: x.countIn })), chords: grid.bars.map(bar => bar.map(c => c.chord.symbol).join(' ')), style: styleId, key, bpm, withBacking: rec === 'mix' });
    setRecMsg('Enregistrement sauvegardé : voir « Mes enregistrements ».');
  };
  const toggle = async () => {
    if (on) { const b = bk.current; b?.dispose(); bk.current = null; setOn(false); setCur(null); keepAwake(false); finishRec(b); return; }
    if (!grid) { setErr('Grille invalide. Exemple : Am7 | D7 | Gmaj7 | Gmaj7'); return; }
    setErr('');
    const ctx = await engine.getContext(); recNotes.current = []; setRecMsg('');
    if (rec !== 'off') {
      await engine.start(s.inputDeviceId || undefined);
      if (engine.status !== 'running') { setErr("Entrée audio indisponible : enregistrement impossible (voir Matériel)."); engine.stop(); return; }
      recorder.current = new Recorder(ctx, rec === 'mix');
    }
    const opts: BackingOptions = { style: styleId, bpm, swing, laps: laps, countIn: countIn ? 1 : 0, accelPerLap: accel, mute,
      section: loopOn ? { from: Math.max(0, loopFrom - 1), to: Math.min(grid.bars.length, loopTo) - 1 } : undefined };
    const b = new Backing(ctx, grid, opts, recorder.current?.mix); b.onBar = setCur; b.onEnd = () => { b.dispose(); setOn(false); setCur(null); keepAwake(false); finishRec(b); };
    bk.current = b; b.start(); recorder.current?.start(); setOn(true);
    keepAwake(true); applyPresetFor(BACKING_CATEGORY[styleId] ?? 'clean', s);
  };
  useOnDisconnect(() => { if (bk.current) { const b = bk.current; b.dispose(); bk.current = null; setOn(false); setCur(null); keepAwake(false); finishRec(b); } });
  useRemote(() => { toggle(); }, s);
  const chords = cur && grid ? grid.bars[cur.bar] : null;
  return (<>
    <h1>Jam</h1>
    <div class="card" style="text-align:center" aria-live="polite">
      {on && cur ? <>
        <div class="muted">{cur.countIn ? 'Décompte…' : `Tour ${cur.lap + 1}${laps ? ' / ' + laps : ''} · mesure ${cur.bar + 1} · ${Math.round(cur.bpm)} BPM`}</div>
        <div style="font-size:4rem;font-weight:800">{cur.countIn ? '1 2 3 4' : chords!.map(c => formatSymbol(c.chord.symbol, s.notation)).join('  ')}</div>
        {grid && !cur.countIn && <div class="muted" style="font-size:1.4rem">Ensuite : {formatSymbol(grid.bars[(cur.bar + 1) % grid.bars.length][0].chord.symbol, s.notation)}</div>}
      </> : <div class="muted">Prêt. Appuyez sur Démarrer.</div>}
      <button class="btn primary" style="margin-top:12px" onClick={toggle}>{on ? 'Arrêter' : 'Démarrer'}</button>
      {err && <p role="alert">{err}</p>}
    </div>
    {grid && <div class="card" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px" aria-label="Grille">
      {grid.bars.map((bar, i) => <div style={`border:2px solid ${cur && !cur.countIn && cur.bar === i ? 'var(--accent)' : 'var(--border)'};border-radius:8px;padding:8px;text-align:center;font-weight:700;${cur && !cur.countIn && cur.bar === i ? 'background:rgba(74,222,128,.15)' : ''}`}>
        {bar.map(c => formatSymbol(c.chord.symbol, s.notation)).join(' ')}</div>)}
    </div>}
    <div class="card">
      <label>Style <select value={styleId} onChange={e => changeStyle(sel(e))}>{STYLES.map(x => <option value={x.id}>{x.name}</option>)}</select></label>
      <label>Tonalité <select value={key} onChange={e => setKey(sel(e))}>{KEYS.map(k => <option value={k}>{s.notation === 'fr' ? formatSymbol(k, 'fr') : k}</option>)}</select></label>
      <label>Tempo <span>{bpm} BPM</span></label>
      <input type="range" style="width:100%" min={st.bpmRange[0]} max={st.bpmRange[1]} value={bpm} aria-label="Tempo" onInput={e => setBpm(Number((e.target as HTMLInputElement).value))} />
      {st.grid === 16 && <label>Swing <input type="range" min="0" max="1" step="0.05" value={swing} onInput={e => setSwing(Number((e.target as HTMLInputElement).value))} /></label>}
      <label>Grille <select value={gridId} onChange={e => setGridId(sel(e))}>{GRID_PRESETS.map(g => <option value={g.id}>{g.name}</option>)}<option value="custom">Personnalisée…</option></select></label>
      {gridId === 'custom' && <><textarea style="width:100%;min-height:80px;font-size:1rem" placeholder="Am7 | D7 | Gmaj7 | Gmaj7   ou   ii7 | V7 | Imaj7" value={custom} onInput={e => setCustom((e.target as HTMLTextAreaElement).value)} />
        {!grid && custom && <p role="alert" class="muted">Grille non reconnue.</p>}</>}
      <label>Nombre de tours <select value={laps} onChange={e => setLaps(Number(sel(e)))}>{[1, 2, 4, 8, 0].map(n => <option value={n}>{n || '∞'}</option>)}</select></label>
      <label>Accélération par tour <select value={accel} onChange={e => setAccel(Number(sel(e)))}>{[0, 2, 4, 5, 8].map(n => <option value={n}>{n ? `+${n} BPM` : 'Non'}</option>)}</select></label>
      <label>Décompte d'une mesure <input type="checkbox" checked={countIn} onChange={e => setCountIn((e.target as HTMLInputElement).checked)} /></label>
      <label>Boucler une section <input type="checkbox" checked={loopOn} onChange={e => setLoopOn((e.target as HTMLInputElement).checked)} /></label>
      {loopOn && grid && <label>Mesures <span><input type="number" min="1" max={grid.bars.length} value={loopFrom} style="width:64px" onChange={e => setLoopFrom(Number((e.target as HTMLInputElement).value))} /> à <input type="number" min="1" max={grid.bars.length} value={loopTo} style="width:64px" onChange={e => setLoopTo(Number((e.target as HTMLInputElement).value))} /></span></label>}
      <div style="display:flex;gap:8px;margin-top:8px">
        {(['drums', 'keys', 'gtr'] as const).map(k => <button class="btn" aria-pressed={mute[k]} style={mute[k] ? 'opacity:.5;text-decoration:line-through' : ''} onClick={() => setMute(m => ({ ...m, [k]: !m[k] }))}>{{ drums: 'Batterie', keys: 'Claviers', gtr: 'Guitare' }[k]}</button>)}
      </div>
    </div>
    <div class="card"><label>Enregistrer <select value={rec} onChange={e => setRec(sel(e) as typeof rec)} disabled={on}><option value="off">Non</option><option value="bass">Ma basse seule</option><option value="mix">Basse + accompagnement</option></select></label>
      {rec !== 'off' && <p class="muted">Utilise l'entrée audio (Plug Pro en USB). Votre basse n'est pas renvoyée dans le casque par l'appli : le Plug Pro la monitore lui-même.</p>}
      {recMsg && <p role="status">{recMsg}</p>}<a href="#/enregistrements">Mes enregistrements →</a></div>
    <p class="muted">Aucune basse dans l'accompagnement : c'est vous.</p>
  </>);
}
