import { useEffect, useRef, useState } from 'preact/hooks';
import { engine } from '../audio/engine';
import { DM_STYLES, DM_VOICES, DrumMachine, patternFromStyle, type DmPattern } from '../audio/drummachine';

export function DrumBox() {
  const [pat, setPat] = useState<DmPattern>(() => patternFromStyle('rock')); const [bpm, setBpm] = useState(100); const [swing, setSwing] = useState(0); const [on, setOn] = useState(false); const [step, setStep] = useState(-1);
  const dm = useRef<DrumMachine | null>(null); const ref = useRef({ pat, bpm, swing }); ref.current = { pat, bpm, swing };
  useEffect(() => { if (dm.current) { dm.current.pattern = pat; dm.current.bpm = bpm; dm.current.swing = swing; } }, [pat, bpm, swing]);
  useEffect(() => () => { dm.current?.dispose(); }, []);
  const toggle = async () => {
    if (on) { dm.current?.dispose(); dm.current = null; setOn(false); setStep(-1); return; }
    const ctx = await engine.getContext(); const d = new DrumMachine(ctx, ref.current.pat, ref.current.bpm, ref.current.swing, (s, t) => setTimeout(() => setStep(s), Math.max(0, (t - ctx.currentTime) * 1000)));
    dm.current = d; d.start(); setOn(true);
  };
  const flip = (v: string, i: number) => setPat(p => ({ ...p, [v]: p[v].map((x, k) => (k === i ? !x : x)) }));
  return (<div class="card"><h2>Boîte à rythmes</h2>
    <label>Modèle <select onChange={e => setPat(patternFromStyle((e.target as HTMLSelectElement).value))}>{DM_STYLES.map(s => <option value={s.id}>{s.name}</option>)}</select></label>
    {DM_VOICES.map(v => <div><div class="muted">{v.label}</div><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin:4px 0 8px">
      {pat[v.id].map((x, i) => <button aria-label={`${v.label} pas ${i + 1}`} aria-pressed={x} style={`min-height:40px;border-radius:8px;border:2px solid ${step === i ? '#facc15' : 'var(--border)'};background:${x ? 'var(--accent)' : 'transparent'};color:var(--on-accent)`} onClick={() => flip(v.id, i)}>{x ? '●' : ''}</button>)}</div></div>)}
    <label>Tempo <span>{bpm} BPM</span></label><input type="range" style="width:100%" min="50" max="200" value={bpm} aria-label="Tempo de la boîte à rythmes" onInput={e => setBpm(Number((e.target as HTMLInputElement).value))} />
    <label>Swing <input type="range" min="0" max="1" step="0.05" value={swing} aria-label="Swing" onInput={e => setSwing(Number((e.target as HTMLInputElement).value))} /></label>
    <button class="btn primary" style="min-height:64px" onClick={toggle}>{on ? 'Arrêter' : 'Jouer'}</button></div>);
}
