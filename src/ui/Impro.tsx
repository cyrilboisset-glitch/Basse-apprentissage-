import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { engine } from '../audio/engine';
import { Backing, type BarInfo } from '../audio/backing/Backing';
import { getStyle } from '../audio/backing/styles';
import { playBassNote } from '../audio/backing/voices';
import { analyze, EXERCISES, makeScripts, type BarScript, type ExDef, type Played, type Result } from '../exercises/impro';
import { formatSymbol, noteRole } from '../theory/chords';
import { GRID_PRESETS, progressionToGrid, type Grid } from '../theory/grid';
import { allPositions } from '../theory/fretboard';
import { getTuning, midiName } from '../audio/notes';
import { pc } from '../theory/scales';
import { Fretboard, type Mark } from './Fretboard';
import { Legend } from './Manche';
import { useNotes } from './useNotes';
import { STATUS_MSG, useEngineStatus } from './useEngine';
import { KEYS } from './Jam';
import { db } from '../storage/db';
import { today } from '../storage/stats';
import { keepAwake } from './wakeLock';
import { applyPresetFor, BACKING_CATEGORY } from '../nux/presets';
import { useOnDisconnect } from './useEngine';

export function Impro({ s }: { s: Settings }) {
  const [ex, setEx] = useState<ExDef | null>(null);
  const [best, setBest] = useState<Record<string, number>>({});
  useEffect(() => { db.sessions.where('module').startsWith('impro:').toArray().then(rows => { const b: Record<string, number> = {}; rows.forEach(r => { const id = r.module.slice(6); b[id] = Math.max(b[id] ?? 0, r.score ?? 0); }); setBest(b); }); }, [ex]);
  if (ex) return <ImproRunner s={s} ex={ex} onExit={() => setEx(null)} />;
  return (<>
    <h1>Improvisation</h1>
    <p class="muted">9 étapes progressives sur backing track. Faites-les dans l'ordre.</p>
    {EXERCISES.map(e => <button class="card" style="width:100%;text-align:left;color:inherit;cursor:pointer" onClick={() => setEx(e)}>
      <b>{e.n}. {e.name}</b>{best[e.id] !== undefined && <span style="float:right" class="muted">meilleur : {best[e.id]} %</span>}
      <div class="muted">{e.summary}</div></button>)}
  </>);
}

export function ImproRunner({ s, ex, onExit }: { s: Settings; ex: ExDef; onExit: () => void }) {
  const tuning = getTuning(s.tuning).midi, status = useEngineStatus();
  const [key, setKey] = useState(ex.key); const [bpm, setBpm] = useState(ex.bpm); const [help, setHelp] = useState(ex.id === 'free');
  const [phase, setPhase] = useState<'setup' | 'run' | 'result'>('setup');
  const [cur, setCur] = useState<BarInfo | null>(null); const [res, setRes] = useState<Result | null>(null);
  const bk = useRef<Backing | null>(null); const scripts = useRef<BarScript[]>([]); const grid = useRef<Grid | null>(null);
  const notes = useRef<Played[]>([]); const t0 = useRef(0);
  const live = useNotes(phase === 'run', s.refA, e => { if (e.midi !== null) notes.current.push({ t: e.t, midi: e.midi }); }, s.inputDeviceId);
  useEffect(() => () => { bk.current?.dispose(); keepAwake(false); }, []);

  const start = async () => {
    const preset = GRID_PRESETS.find(g => g.id === ex.gridId)!; const g = progressionToGrid(preset.romans, key)!;
    grid.current = g; scripts.current = makeScripts(ex, g, ex.laps); notes.current = []; t0.current = performance.now();
    const ctx = await engine.getContext();
    const b = new Backing(ctx, g, { style: ex.style, bpm, swing: getStyle(ex.style).swing, laps: ex.laps, countIn: 1, mute: { drums: false, keys: false, gtr: false } });
    b.onSchedule = info => {
      if (info.countIn) return; const sc = scripts.current[info.seq - 1]; if (!sc?.phrase) return;
      const bd = 60 / info.bpm; sc.phrase.forEach(n => playBassNote(ctx, b.bus, info.time + n.beat * bd, n.midi, Math.max(0.1, n.dur * bd)));
    };
    b.onBar = setCur; b.onEnd = () => finish(b);
    bk.current = b; setPhase('run'); b.start(); keepAwake(true); applyPresetFor(BACKING_CATEGORY[ex.style] ?? 'clean', s);
  };
  const finish = async (b: Backing) => {
    const bars = b.barTimes.filter(x => !x.countIn).map(x => ({ time: x.time, bpm: x.bpm, bar: x.bar }));
    const lat = (s.inputMode === 'usb' ? s.latencyUsbMs : s.latencyBluetoothMs) / 1000;
    const r = analyze(ex, bars, scripts.current, grid.current!, notes.current.map(n => ({ t: n.t - lat, midi: n.midi })));
    b.dispose(); bk.current = null; keepAwake(false); setRes(r); setPhase('result'); setCur(null);
    await db.sessions.add({ date: today(), module: `impro:${ex.id}`, seconds: Math.round((performance.now() - t0.current) / 1000), score: r.score, note: `${key} ${bpm} BPM` });
  };
  const stop = () => { bk.current?.dispose(); bk.current = null; keepAwake(false); setPhase('setup'); setCur(null); };

  if (phase === 'result' && res) return (<>
    <h1>Bilan — {ex.name}</h1>
    <div class="card" role="status"><div style="font-size:3rem;font-weight:800">{res.score} %</div>
      <p>{res.metrics.notes} notes · {Math.round(res.metrics.inChordPct * 100)} % dans l'accord · placement {Math.round(res.metrics.rhythmPct * 100)} % · {res.metrics.meanOffsetMs >= 0 ? '+' : ''}{Math.round(res.metrics.meanOffsetMs)} ms en moyenne</p></div>
    <div class="card"><h2>Conseil du prof</h2>{res.advice.map(a => <p>• {a}</p>)}</div>
    {res.items.length > 0 && <div class="card"><h2>Détail</h2><div style="display:flex;flex-wrap:wrap;gap:6px">{res.items.map(i => <span title={i.label} style={`padding:4px 10px;border-radius:12px;background:${i.ok ? '#14532d' : '#7f1d1d'}`}>{i.ok ? '✓' : '✗'} {i.label.replace('Mesure ', 'M')}</span>)}</div></div>}
    <button class="btn primary" onClick={() => setPhase('setup')}>Refaire</button>
    <button class="btn" style="margin-top:8px" onClick={onExit}>Retour</button>
  </>);

  useOnDisconnect(() => { if (phase === 'run') stop(); });
  const idx = cur ? cur.seq - 1 : -1; const sc: BarScript | undefined = idx >= 0 ? scripts.current[idx] : undefined;
  const g = grid.current; const chord = cur && g && !cur.countIn ? g.bars[cur.bar][0].chord : null;
  const marks = new Map<string, Mark>();
  if (chord && (help || ex.id === 'free')) for (const p of allPositions(tuning, Math.min(12, s.frets))) {
    const role = noteRole(pc(p.midi), chord);
    if (['root', 'third', 'fifth', 'seventh', 'avoid'].includes(role)) marks.set(`${p.string}:${p.fret}`, { role, label: role === 'avoid' ? '✗' : midiName(p.midi, s.notation).name });
  }
  return (<>
    <div style="display:flex;justify-content:space-between;align-items:center"><h1>{ex.n}. {ex.name}</h1></div>
    {STATUS_MSG[status] && <div class="card" role="alert">{STATUS_MSG[status]}</div>}
    {phase === 'setup' ? <>
      <div class="card"><p>{ex.summary}</p>
        <label>Tonalité <select value={key} onChange={e => setKey((e.target as HTMLSelectElement).value)}>{KEYS.map(k => <option value={k}>{s.notation === 'fr' ? formatSymbol(k, 'fr') : k}</option>)}</select></label>
        <label>Tempo <span>{bpm} BPM</span></label><input type="range" style="width:100%" min={getStyle(ex.style).bpmRange[0]} max={getStyle(ex.style).bpmRange[1]} value={bpm} onInput={e => setBpm(Number((e.target as HTMLInputElement).value))} aria-label="Tempo" />
        <label>Afficher les notes sûres sur le manche <input type="checkbox" checked={help} onChange={e => setHelp((e.target as HTMLInputElement).checked)} /></label>
        <p class="muted">Casque branché, calibration de latence faite (Outils → Matériel). {ex.laps} tour(s) de grille, décompte d'une mesure.</p></div>
      <button class="btn primary" onClick={start}>Démarrer</button><button class="btn" style="margin-top:8px" onClick={onExit}>Retour</button>
    </> : <>
      <div class="card" style="text-align:center" aria-live="polite">
        <div class="muted">{cur?.countIn ? 'Décompte…' : cur ? `Tour ${cur.lap + 1}/${ex.laps} · mesure ${cur.bar + 1}` : ''}</div>
        <div style="font-size:4.2rem;font-weight:800">{cur?.countIn ? '1 2 3 4' : chord ? formatSymbol(chord.symbol, s.notation) : '…'}</div>
        <div style="font-size:1.4rem;color:var(--accent)">{sc?.mode === 'listen' ? '🎧 Écoutez' : sc?.prompt}</div>
        {sc?.targetLabel && <div class="muted">{sc.targetLabel}</div>}
      </div>
      {help && <><Fretboard tuning={tuning} from={0} to={Math.min(12, s.frets)} leftHanded={s.leftHanded} marks={marks} live={live} /><Legend /></>}
      <button class="btn" style="margin-top:12px" onClick={stop}>Arrêter</button>
    </>}
  </>);
}
