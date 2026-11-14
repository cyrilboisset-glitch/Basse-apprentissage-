import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { engine } from '../audio/engine';
import { Metronome } from '../audio/metronome';
import { analyzeGroove, nextTempo, patternBars, RHYTHMS, TECHNIQUE, type BarT, type GroovePattern, type GrooveResult, type Onset } from '../exercises/groove';
import { useNotes } from './useNotes';
import { STATUS_MSG, useEngineStatus } from './useEngine';
import { db } from '../storage/db';
import { today } from '../storage/stats';
import { keepAwake } from './wakeLock';
import { applyPresetFor } from '../nux/presets';
import { useOnDisconnect } from './useEngine';
import { useRemote } from './useRemote';
import { CalibGate, needsCalibration } from './CalibGate';

const VANISH = [{ v: '', l: 'Clic permanent' }, { v: '2', l: 'Clic 1 mesure sur 2' }, { v: '4', l: 'Clic 1 mesure sur 4 (3/4 muettes)' }, { v: '8', l: 'Clic 1 mesure sur 8 (7/8 muettes)' }];

export function Groove({ s }: { s: Settings }) {
  const [p, setP] = useState<GroovePattern | null>(null);
  const [best, setBest] = useState<Record<string, number>>({});
  useEffect(() => { db.sessions.where('module').startsWith('groove:').toArray().then(rows => { const b: Record<string, number> = {}; rows.forEach(r => { const id = r.module.slice(7); b[id] = Math.max(b[id] ?? 0, r.score ?? 0); }); setBest(b); }); }, [p]);
  if (p) return <GrooveRun s={s} p={p} onExit={() => setP(null)} />;
  const list = (title: string, items: GroovePattern[]) => <div class="card"><h2>{title}</h2>
    {items.map(x => <button class="btn" style="margin:6px 0;text-align:left;padding:8px 16px" onClick={() => setP(x)}>{x.name}{best[x.id] !== undefined && <span class="muted" style="float:right">{best[x.id]} %</span>}</button>)}</div>;
  return (<>
    <h1>Groove</h1>
    <p class="muted">Un seul but : jouer pile sur le temps, régulièrement. Casque branché et latence calibrée (Outils → Matériel).</p>
    {list('Rythmes sur une note', RHYTHMS)}{list('Technique des doigts', TECHNIQUE)}
  </>);
}

function Slots({ p, beat }: { p: GroovePattern; beat: number }) {
  const n = p.events.some(e => Math.abs(e.beat * 3 - Math.round(e.beat * 3)) < 1e-6 && Math.abs(e.beat * 4 - Math.round(e.beat * 4)) > 1e-6) ? 12 : 16;
  const cycle = patternBars(p), total = n * cycle;
  const idx = (b: number) => Math.round(b * (n / 4));
  const map = new Map(p.events.map(e => [idx(e.beat), e.kind]));
  return <div style={`display:grid;grid-template-columns:repeat(${n},1fr);gap:3px;margin:12px 0`} aria-hidden="true">
    {Array.from({ length: Math.min(total, n * 2) }, (_, i) => { const k = map.get(i), now = beat >= 0 && Math.floor(beat * (n / 4)) === i;
      return <div style={`height:28px;border-radius:6px;display:grid;place-items:center;border:2px solid ${now ? 'var(--accent)' : 'var(--border)'};${i % (n / 4) === 0 ? 'border-bottom-color:var(--muted)' : ''}`}>{k === 'note' ? '●' : k === 'ghost' ? '○' : ''}</div>; })}</div>;
}

export function GrooveRun({ s, p, onExit }: { s: Settings; p: GroovePattern; onExit: () => void }) {
  const status = useEngineStatus();
  const [bpm, setBpm] = useState(80); const [nBars, setNBars] = useState(patternBars(p) > 1 ? 8 : 8); const [vanish, setVanish] = useState('');
  const [selfGhost, setSelfGhost] = useState(false); const [skipCal, setSkipCal] = useState(false); const gated = needsCalibration(s) && !skipCal;
  const [phase, setPhase] = useState<'setup' | 'run' | 'result'>('setup');
  const [bar, setBar] = useState(0); const [beat, setBeat] = useState(-1); const [res, setRes] = useState<GrooveResult | null>(null);
  const onsets = useRef<Onset[]>([]); const bars = useRef<BarT[]>([]); const m = useRef<Metronome | null>(null); const t0 = useRef(0); const used = useRef(80);
  useNotes(phase === 'run', s.refA, e => onsets.current.push({ t: e.t, midi: e.midi, level: e.level }), s.inputDeviceId);
  useEffect(() => { db.kv.get('groove:tempo:' + p.id).then(r => { if (r) setBpm(r.value as number); }); return () => { m.current?.stop(); keepAwake(false); }; }, []);
  const total = Math.ceil(nBars / patternBars(p)) * patternBars(p);

  const start = async () => {
    const ctx = await engine.getContext(); onsets.current = []; bars.current = []; used.current = bpm; t0.current = performance.now();
    const mb = vanish ? { play: 1, of: Number(vanish) } : undefined; let seq = -1; let finished = false;
    const mt = new Metronome(ctx, { bpm, beatsPerBar: 4, subdivision: 1, accent: true, muteBars: mb }, (b, t) => {
      if (b === 0) { seq++; if (seq >= 1) bars.current.push({ time: t, bpm, audible: !mb || seq % mb.of < mb.play }); setBar(seq); }
      setTimeout(() => setBeat(b), Math.max(0, (t - ctx.currentTime) * 1000));
      if (seq >= total && b === 0 && !finished) { finished = true; mt.stop(); bars.current.pop(); setTimeout(() => finish(), 500); }
    });
    m.current = mt; setPhase('run'); setBar(0); mt.start(); keepAwake(true); applyPresetFor(p.id === 'funk16' || p.id === 'ghost' ? 'funk' : 'clean', s);
  };
  const finish = async () => {
    const lat = (s.inputMode === 'usb' ? s.latencyUsbMs : s.latencyBluetoothMs) / 1000;
    const r = analyzeGroove(p, bars.current, onsets.current, { latencyS: lat, ignoreGhosts: selfGhost });
    m.current?.stop(); keepAwake(false); setRes(r); setPhase('result');
    const nt = nextTempo(used.current, r.success); await db.kv.put({ key: 'groove:tempo:' + p.id, value: nt });
    await db.sessions.add({ date: today(), module: `groove:${p.id}`, seconds: Math.round((performance.now() - t0.current) / 1000), score: Math.round(r.success * 100), note: `${used.current} BPM ±${Math.round(r.sdMs)} ms` });
  };
  const stop = () => { m.current?.stop(); keepAwake(false); setPhase('setup'); };

  useOnDisconnect(() => { if (phase === 'run') stop(); });
  useRemote(() => { if (phase === 'run') stop(); else if (phase === 'setup' && !gated) start(); }, s);
  if (phase === 'result' && res) {
    const nt = nextTempo(used.current, res.success);
    return (<>
      <h1>Bilan — {p.name}</h1>
      <div class="card" role="status"><div style="font-size:3rem;font-weight:800">{Math.round(res.success * 100)} %</div>
        {res.devs.length < 4 ? <p>à {used.current} BPM · notes détectées : {res.devs.length}</p> : <><p>à {used.current} BPM · {res.verdict.bias === 'centré' ? 'centré sur le temps' : res.verdict.bias === 'retard' ? `en retard de ${Math.round(res.meanMs)} ms` : `en avance de ${Math.round(-res.meanMs)} ms`} · {res.verdict.regularity} (±{Math.round(res.sdMs)} ms)</p>
        <p class="muted">{res.missed} manquée(s) · {res.extra} en trop{res.wrongPitch ? ` · ${res.wrongPitch} fausse(s)` : ''}{res.driftBpm !== null ? ` · dérive sans clic : ${res.driftBpm >= 0 ? '+' : ''}${res.driftBpm.toFixed(1)} BPM` : ''}</p></>}</div>
      {res.devs.length >= 4 && <Curve res={res} />}
      <div class="card"><h2>Conseil du prof</h2>{res.advice.map(a => <p>• {a}</p>)}</div>
      <button class="btn primary" onClick={() => { setBpm(nt); setPhase('setup'); }}>{nt > used.current ? `Réussi ! Refaire à ${nt} BPM` : 'Refaire'}</button>
      <button class="btn" style="margin-top:8px" onClick={onExit}>Retour</button>
    </>);
  }
  return (<>
    <h1>{p.name}</h1>
    {STATUS_MSG[status] && <div class="card" role="alert">{STATUS_MSG[status]}</div>}
    <p class="muted">{p.hint}</p>
    <Slots p={p} beat={phase === 'run' && beat >= 0 && bar >= 1 ? beat : -1} />
    {phase === 'setup' ? <>
      <div class="card">
        <label>Tempo <span>{bpm} BPM</span></label><input type="range" style="width:100%" min="40" max="200" value={bpm} aria-label="Tempo" onInput={e => setBpm(Number((e.target as HTMLInputElement).value))} />
        <label>Mesures <select value={nBars} onChange={e => setNBars(Number((e.target as HTMLSelectElement).value))}>{[4, 8, 16].map(n => <option>{n}</option>)}</select></label>
        <label>Clic <select value={vanish} onChange={e => setVanish((e.target as HTMLSelectElement).value)}>{VANISH.map(v => <option value={v.v}>{v.l}</option>)}</select></label>
        {p.events.some(e => e.kind === 'ghost') && <label>Ignorer les notes étouffées (auto-évaluation) <input type="checkbox" checked={selfGhost} onChange={e => setSelfGhost((e.target as HTMLInputElement).checked)} /></label>}
        <p class="muted">Une mesure de décompte, puis {total} mesures. À 90 % de réussite : +5 BPM.</p></div>
      {gated ? <CalibGate s={s} onSkip={() => setSkipCal(true)} /> : <button class="btn primary" onClick={start}>Démarrer</button>}<button class="btn" style="margin-top:8px" onClick={onExit}>Retour</button>
    </> : <>
      <div class="card" style="text-align:center" aria-live="polite"><div style="font-size:3rem;font-weight:800">{bar === 0 ? 'Décompte' : `${Math.min(bar, total)} / ${total}`}</div>
        <div style="display:flex;gap:8px;justify-content:center">{[0, 1, 2, 3].map(i => <div style={`width:34px;height:34px;border-radius:50%;background:${beat === i ? (i === 0 ? 'var(--danger)' : 'var(--accent)') : 'var(--border)'}`} />)}</div>
        {vanish && bar >= 1 && !bars.current[bar - 1]?.audible && <p class="muted">🔇 clic coupé — gardez le tempo</p>}</div>
      <button class="btn" onClick={stop}>Arrêter</button>
    </>}
  </>);
}

function Curve({ res }: { res: GrooveResult }) {
  const d = res.devs, W = 320, H = 140, y = (ms: number) => H / 2 - Math.max(-100, Math.min(100, ms)) * (H / 2 - 8) / 100, x = (i: number) => 8 + i * (W - 16) / Math.max(1, d.length - 1);
  return <div class="card"><h2>Écart par note (ms)</h2>
    <svg viewBox={`0 0 ${W} ${H}`} style="width:100%" role="img" aria-label="Courbe des écarts rythmiques">
      <rect x="0" y={y(50)} width={W} height={y(-50) - y(50)} fill="var(--accent)" opacity=".12" />
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--muted)" /><text x="4" y={y(50) - 2} font-size="9" fill="var(--muted)">+50 (tard)</text><text x="4" y={y(-50) + 10} font-size="9" fill="var(--muted)">−50 (tôt)</text>
      <polyline points={d.map((v, i) => `${x(i)},${y(v.devMs)}`).join(' ')} fill="none" stroke="var(--muted)" stroke-width="1" />
      {d.map((v, i) => <circle cx={x(i)} cy={y(v.devMs)} r="3" fill={v.wrongPitch ? '#c084fc' : Math.abs(v.devMs) <= 25 ? 'var(--accent)' : Math.abs(v.devMs) <= 50 ? '#facc15' : 'var(--danger)'} />)}
      <line x1="0" x2={W} y1={y(res.meanMs)} y2={y(res.meanMs)} stroke="#60a5fa" stroke-dasharray="4 3" /></svg>
    <p class="muted">Vert ≤ 25 ms · jaune ≤ 50 ms · rouge au-delà. Ligne bleue : écart moyen.</p></div>;
}
