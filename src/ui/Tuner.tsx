import { useEffect, useRef, useState } from 'preact/hooks';
import { engine } from '../audio/engine';
import { allTunings, describeFreq, getTuning, midiName, midiToFreq } from '../audio/notes';
import { CustomTuningEditor } from './CustomTuning';
import type { Settings } from '../storage/settings';
import { STATUS_MSG, useEngineStatus } from './useEngine';
import { nux } from '../nux/plugpro';
import { useNuxStatus } from '../nux/presets';

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

export function Tuner({ s, set, onClose }: { s: Settings; set: (p: Partial<Settings>) => void; onClose: () => void }) {
  const status = useEngineStatus(); const nst = useNuxStatus(); const [src, setSrc] = useState<'app' | 'nux'>('app'); const [nuxCap, setNuxCap] = useState(nux.caps.tuner);
  const tuning = getTuning(s.tuning);
  const [guided, setGuided] = useState(false);
  const [target, setTarget] = useState(0);
  const [view, setView] = useState<{ name: string; oct: number; cents: number; freq: number } | null>(null);
  const [weak, setWeak] = useState(false);
  const hist = useRef<number[]>([]); const centsAvg = useRef(0); const okSince = useRef(0); const lastSeen = useRef(0);

  useEffect(() => { if (src !== 'app') return; engine.start(s.inputDeviceId || undefined); return () => engine.stop(); }, [src]);
  useEffect(() => {
    if (src !== 'nux') return; setView(null); hist.current = [];
    const off = nux.subscribeTuner(t => { setNuxCap(nux.caps.tuner); if (t.pc === null || t.cents === null) { setView(null); return; } const n = midiName(t.pc + 24, s.notation); setView({ name: n.name, oct: n.octave, cents: t.cents, freq: 0 }); });
    nux.tunerSet({ on: true, mode: 'bass', refHz: s.refA, mute: false });
    return () => { off(); nux.tunerSet({ on: false, mode: 'bass', refHz: s.refA, mute: false }); };
  }, [src]);
  useEffect(() => {
    if (src !== 'app') return;
    return engine.onPitch(e => {
      const now = performance.now();
      if (e.freq === null || e.clarity < 0.8) {
        setWeak(e.level < 0.003);
        if (now - lastSeen.current > 600) { setView(null); hist.current = []; okSince.current = 0; }
        return;
      }
      setWeak(false); lastSeen.current = now;
      hist.current = [...hist.current.slice(-4), e.freq];
      const f = median(hist.current); // médiane : écarte les sauts d'octave isolés
      const ref = guided ? midiToFreq(tuning.midi[target], s.refA) : undefined;
      const info = describeFreq(f, s.refA, s.notation);
      const cents = ref ? 1200 * Math.log2(f / ref) : info.cents;
      centsAvg.current = centsAvg.current * 0.6 + cents * 0.4; // lissage de l'aiguille
      const shown = guided ? midiName(tuning.midi[target], s.notation) : { name: info.name, octave: info.octave };
      setView({ name: shown.name, oct: shown.octave, cents: centsAvg.current, freq: f });
      if (guided) {
        if (Math.abs(centsAvg.current) <= 3) {
          okSince.current ||= now;
          if (now - okSince.current > 900) { okSince.current = 0; setTarget(t => Math.min(t + 1, tuning.midi.length - 1)); }
        } else okSince.current = 0;
      }
    });
  }, [guided, target, s.tuning, s.refA, s.notation, src]);

  const c = view ? Math.max(-50, Math.min(50, view.cents)) : 0;
  const inTune = view && Math.abs(view.cents) <= 3;
  const color = !view ? 'var(--muted)' : inTune ? 'var(--accent)' : Math.abs(view.cents) < 15 ? '#facc15' : 'var(--danger)';

  return (
    <div role="dialog" aria-label="Accordeur" style="position:fixed;inset:0;z-index:10;background:var(--bg);padding:16px;overflow:auto">
      <button class="btn" onClick={onClose} style="min-height:48px">Fermer</button>
      <div style="display:flex;gap:8px;margin:8px 0" role="tablist" aria-label="Source de l'accordeur">
        <button role="tab" aria-selected={src === 'app'} class="btn" style={src === 'app' ? 'background:var(--accent);color:var(--on-accent)' : ''} onClick={() => setSrc('app')}>Accordeur de l'appli</button>
        <button role="tab" aria-selected={src === 'nux'} class="btn" disabled={nst !== 'connected' || nuxCap === 'unavailable'} style={src === 'nux' ? 'background:var(--accent);color:var(--on-accent)' : ''} onClick={() => setSrc('nux')}>Plug Pro</button></div>
      {nst !== 'connected' && <p class="muted">Accordeur du Plug Pro : connectez-le dans Outils → Matériel.</p>}
      {nuxCap === 'unavailable' && <p class="muted" role="note">Accordeur du Plug Pro non disponible (firmware trop ancien ?) : utilisez celui de l'appli.</p>}
      {src === 'app' && status !== 'running' && status !== 'idle' && (
        <div class="card" role="alert">{STATUS_MSG[status]}
          {status !== 'starting' && <button class="btn" style="margin-top:8px" onClick={() => engine.reconnect(s.inputDeviceId || undefined)}>Réessayer</button>}
        </div>)}
      <div style={`text-align:center;color:${color};margin-top:16px`}>
        <div style="font-size:7rem;font-weight:800;line-height:1" aria-live="polite">{view ? view.name : '—'}<small style="font-size:2rem">{src === 'app' ? view?.oct : ''}</small></div>
        <div style="font-size:1.6rem">{view ? `${view.cents > 0 ? '+' : ''}${view.cents.toFixed(1)} cents${view.freq ? ` · ${view.freq.toFixed(2)} Hz` : ''}` : weak ? 'Signal trop faible' : src === 'nux' ? 'Jouez une corde (accordeur Plug Pro)' : 'Jouez une corde à vide'}</div>
        <div role="img" aria-label="Aiguille" style="position:relative;height:90px;margin:16px 0;border-bottom:2px solid var(--border)">
          <div style="position:absolute;left:44%;width:12%;top:0;bottom:0;background:var(--accent);opacity:.2"/>
          <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:var(--muted)"/>
          <div style={`position:absolute;left:${50 + c}%;top:0;bottom:0;width:6px;margin-left:-3px;border-radius:3px;background:${color};transition:left .08s`}/>
          <div class="muted" style="position:absolute;left:0;bottom:-24px">♭ −50</div><div class="muted" style="position:absolute;right:0;bottom:-24px">+50 ♯</div>
        </div>
        {view && <div style="font-size:1.4rem;margin-top:32px">{inTune ? '✔ Juste' : view.cents < 0 ? '↑ Trop bas : serrez' : '↓ Trop haut : desserrez'}</div>}
      </div>
      <div class="card">
        <label>Accordage
          <select value={s.tuning} onChange={e => { const id = (e.target as HTMLSelectElement).value; set({ tuning: id, strings: getTuning(id).midi.length >= 5 ? 5 : 4 }); setTarget(0); }}>
            {allTunings().map(t => <option value={t.id}>{t.label}</option>)}</select></label>
        {s.tuning === 'custom' && <CustomTuningEditor s={s} set={set} />}
        <label>La de référence (Hz) <input type="number" min="415" max="466" value={s.refA} onChange={e => set({ refA: Number((e.target as HTMLInputElement).value) })} /></label>
        <label>Mode guidé corde par corde <input type="checkbox" checked={guided} onChange={e => { setGuided((e.target as HTMLInputElement).checked); setTarget(0); }} /></label>
        {guided && <div style="display:flex;gap:8px">{tuning.midi.map((m, i) => {
          const n = midiName(m, s.notation);
          return <button class="btn" style={i === target ? 'background:var(--accent);color:var(--on-accent)' : ''} onClick={() => setTarget(i)}>{n.name}{n.octave}</button>; })}</div>}
      </div>
      <p class="muted">Ordre conseillé : de la corde la plus grave à la plus aiguë. L'accordeur du Plug Pro sera proposé en phase 9 si le firmware le permet.</p>
    </div>
  );
}
