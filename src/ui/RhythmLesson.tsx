import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { engine } from '../audio/engine';
import { Metronome } from '../audio/metronome';
import { analyzeGroove, type BarT, type GrooveResult, type Onset } from '../exercises/groove';
import { countSyllable, durName, slots, toPattern, type RhythmSpec } from '../exercises/rhythm';
import { useNotes } from './useNotes';
import { STATUS_MSG, useEngineStatus } from './useEngine';
import { CalibGate, needsCalibration } from './CalibGate';

/** Le rythme « dessiné » : chaque bloc a une largeur proportionnelle à sa durée, avec son comptage et son nom. */
export function RhythmStrip({ spec, beat = -1 }: { spec: RhythmSpec; beat?: number }) {
  const sl = slots(spec);
  return (
    <div role="img" aria-label={`Rythme : ${sl.map(x => `${x.rest ? 'silence' : 'note'} de ${durName(x.dur, x.rest, spec.compound)}`).join(', ')}`} style="margin:12px 0">
      <div style="display:flex;gap:3px">{sl.map(x => <div style={`flex:${x.dur} 1 0;min-width:0;min-height:76px;border-radius:8px;padding:6px 4px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;${x.rest ? 'border:1.5px dashed var(--border-strong);color:var(--muted)' : 'border:1.5px solid var(--accent);background:var(--accent-soft)'}`}>
        <span class="num" style="font-size:1.05rem;font-weight:500">{x.rest ? '' : countSyllable(x.start)}</span>
        <span style="font-size:.64rem;line-height:1.15;overflow-wrap:anywhere">{durName(x.dur, x.rest, spec.compound)}</span></div>)}</div>
      <div style="display:flex;margin-top:4px">{Array.from({ length: spec.bpb }, (_, i) => <div class="num" style={`flex:1;border-left:2px solid ${beat === i ? 'var(--accent)' : 'var(--border-strong)'};padding-left:4px;font-size:.8rem;color:${beat === i ? 'var(--accent-text)' : 'var(--muted)'};font-weight:${beat === i ? 700 : 400}`}>{i + 1}</div>)}</div>
    </div>);
}

/** Lire un rythme, puis le jouer sur le clic (n'importe quelle note) : mesuré en millisecondes. */
export function RhythmPlay({ s, spec, onDone }: { s: Settings; spec: RhythmSpec; onDone: (success: number) => void }) {
  const status = useEngineStatus();
  const [bpm, setBpm] = useState(spec.bpm); const [phase, setPhase] = useState<'setup' | 'run' | 'result'>('setup');
  const [skipCal, setSkipCal] = useState(false); const gated = needsCalibration(s) && !skipCal;
  const [bar, setBar] = useState(0); const [beat, setBeat] = useState(-1); const [res, setRes] = useState<GrooveResult | null>(null); const best = useRef(0);
  const ons = useRef<Onset[]>([]); const bars = useRef<BarT[]>([]); const m = useRef<Metronome | null>(null);
  useNotes(phase === 'run', s.refA, e => ons.current.push({ t: e.t, midi: e.midi }), s.inputDeviceId);
  useEffect(() => () => { m.current?.stop(); }, []);
  useEffect(() => { setPhase('setup'); setRes(null); setBpm(spec.bpm); best.current = 0; }, [spec]);

  const start = async () => {
    const ctx = await engine.getContext(); ons.current = []; bars.current = []; let seq = -1, done = false;
    const mt = new Metronome(ctx, { bpm, beatsPerBar: spec.bpb, subdivision: 1, accent: true }, (b, t) => {
      if (b === 0) { seq++; if (seq >= 1) bars.current.push({ time: t, bpm, audible: true }); setBar(seq); }
      setTimeout(() => setBeat(b), Math.max(0, (t - ctx.currentTime) * 1000));
      if (seq >= spec.bars + 1 && b === 0 && !done) { done = true; mt.stop(); bars.current.pop(); setTimeout(finish, 500); } // décompte + N mesures
    });
    m.current = mt; setPhase('run'); setBar(0); mt.start();
  };
  const finish = () => {
    const lat = (s.inputMode === 'usb' ? s.latencyUsbMs : s.latencyBluetoothMs) / 1000;
    const r = analyzeGroove(toPattern(spec), bars.current, ons.current, { latencyS: lat, beatsPerBar: spec.bpb });
    best.current = Math.max(best.current, r.devs.length < 2 ? 0 : r.success); setRes(r); setPhase('result');
  };
  const stop = () => { m.current?.stop(); setPhase('setup'); setBeat(-1); };

  return (<div class="card">
    <b>{spec.name}</b>{spec.hint && <p class="muted" style="margin:4px 0">{spec.hint}</p>}
    <RhythmStrip spec={spec} beat={phase === 'run' && bar >= 1 ? beat : -1} />
    {STATUS_MSG[status] && <p role="alert">{STATUS_MSG[status]}</p>}
    {phase === 'setup' && <>
      <label>Tempo <span class="num">{bpm} BPM</span></label>
      <input type="range" style="width:100%" min="40" max="140" value={bpm} aria-label="Tempo du rythme" onInput={e => setBpm(Number((e.target as HTMLInputElement).value))} />
      <p class="muted" style="font-size:.85rem">Une mesure de décompte, puis {spec.bars} mesures : jouez ce rythme (n’importe quelle note) sur le clic.</p>
      {gated ? <CalibGate s={s} onSkip={() => setSkipCal(true)} /> : <button class="btn primary" onClick={start}>Jouer ce rythme</button>}
      <button class="btn ghost" style="margin-top:6px" onClick={() => onDone(best.current)}>Passer cet exercice</button></>}
    {phase === 'run' && <><div class="num" style="text-align:center;font-size:1.4rem;margin:8px 0">{bar === 0 ? 'Décompte' : `Mesure ${Math.min(bar, spec.bars)} / ${spec.bars}`}</div><button class="btn" onClick={stop}>Arrêter</button></>}
    {phase === 'result' && res && <div role="status">
      <div class="num" style="font-size:2rem">{res.devs.length < 2 ? 'Aucune note détectée' : `${Math.round(res.success * 100)} %`}</div>
      {res.devs.length >= 2 && <p class="muted">{res.verdict.bias === 'centré' ? 'Centré sur le temps' : res.verdict.bias === 'retard' ? `En retard de ${Math.round(res.meanMs)} ms` : `En avance de ${Math.round(-res.meanMs)} ms`} · {res.missed} note(s) manquée(s) · {res.extra} en trop</p>}
      {res.advice.map(a => <p>• {a}</p>)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><button class="btn" onClick={() => setPhase('setup')}>Réessayer</button><button class="btn primary" onClick={() => onDone(best.current)}>Continuer</button></div></div>}
  </div>);
}
