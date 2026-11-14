import { useEffect, useRef, useState } from 'preact/hooks';
import { engine } from '../audio/engine';
import { allTunings, describeFreq, getTuning, midiName, midiToFreq } from '../audio/notes';
import { CustomTuningEditor } from './CustomTuning';
import type { Settings } from '../storage/settings';
import { STATUS_MSG, useEngineStatus } from './useEngine';
import { nux } from '../nux/plugpro';
import { Icon } from './Icon';
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
  const near = view && !inTune && Math.abs(view.cents) < 15;
  const color = !view ? 'var(--muted)' : inTune ? 'var(--ok)' : near ? 'var(--accent)' : 'var(--danger)';
  const needle = !view ? 'var(--faint)' : inTune ? 'var(--ok)' : 'var(--accent)';
  const hint = !view ? (weak ? 'Signal trop faible : jouez plus fort' : src === 'nux' ? 'Jouez une corde (accordeur Plug Pro)' : 'Jouez une corde à vide')
    : inTune ? 'Juste' : view.cents < 0 ? (near ? 'Presque : serrez très légèrement' : 'Trop bas : serrez') : (near ? 'Presque : desserrez très légèrement' : 'Trop haut : desserrez');

  return (
    <div role="dialog" aria-label="Accordeur" style="position:fixed;inset:0;z-index:10;background:var(--bg);overflow:auto">
      <div style="max-width:560px;margin:0 auto;padding:0 20px 32px">
        <div style="height:64px;display:grid;grid-template-columns:56px 1fr 56px;align-items:center;margin:0 -12px">
          <button class="icon-btn" aria-label="Fermer" onClick={onClose}><Icon name="close" /></button>
          <div style="text-align:center;font-size:1.05rem;font-weight:600">Accordeur</div><span />
        </div>
        <div class="seg" role="tablist" aria-label="Source de l'accordeur">
          <button role="tab" aria-selected={src === 'app'} onClick={() => setSrc('app')}>Accordeur de l'appli</button>
          <button role="tab" aria-selected={src === 'nux'} disabled={nst !== 'connected' || nuxCap === 'unavailable'} onClick={() => setSrc('nux')}>Plug Pro</button></div>
        {nst !== 'connected' && <p class="muted" style="font-size:.85rem">Accordeur du Plug Pro : connectez-le dans Outils → Matériel.</p>}
        {nuxCap === 'unavailable' && <p class="muted" role="note">Accordeur du Plug Pro non disponible (firmware trop ancien ?) : utilisez celui de l'appli.</p>}
        {src === 'app' && status !== 'running' && status !== 'idle' && (
          <div class="card" role="alert">{STATUS_MSG[status]}
            {status !== 'starting' && <button class="btn" style="margin-top:8px" onClick={() => engine.reconnect(s.inputDeviceId || undefined)}>Réessayer</button>}
          </div>)}

        <div style="text-align:center;margin-top:20px" aria-live="polite">
          <div style={`font-size:clamp(6rem,34vw,9rem);font-weight:600;letter-spacing:-.04em;line-height:1;display:flex;justify-content:center;color:${view ? 'var(--text)' : 'var(--faint)'}`}>{view ? view.name : '—'}<span style="font-size:.34em;font-weight:500;color:var(--muted);letter-spacing:0;margin:.35em 0 0 .08em">{src === 'app' ? view?.oct : ''}</span></div>
          <div class="num" style="font-size:1.2rem;margin-top:6px">{view ? <>{`${view.freq ? `${view.freq.toFixed(2)} Hz · ` : ''}`}<span style={`color:${color}`}>{`${view.cents > 0 ? '+' : ''}${view.cents.toFixed(1)} cents`}</span></> : <span class="muted" style="font-family:var(--font)">{hint}</span>}</div>
        </div>

        <div style="margin-top:24px" role="img" aria-label={view ? `Aiguille à ${view.cents.toFixed(1)} cents` : 'Aiguille : aucun signal'}>
          <div style="position:relative;height:64px">
            <div style="position:absolute;left:47%;width:6%;top:10px;height:36px;border-radius:6px;background:var(--ok-bg);border:1px solid var(--ok);box-sizing:border-box;opacity:.9" />
            <div style="position:absolute;left:0;right:0;top:20px;height:16px;background:repeating-linear-gradient(90deg,var(--border-strong) 0 1px,transparent 1px 5%)" />
            {[0, 25, 75, 100].map(l => <div style={`position:absolute;left:${l}%;top:14px;width:1px;height:28px;background:var(--faint)`} />)}
            <div style="position:absolute;left:50%;top:8px;width:2px;height:40px;margin-left:-1px;background:var(--ok)" />
            <div style={`position:absolute;left:${50 + c}%;top:4px;width:4px;height:48px;margin-left:-2px;border-radius:2px;background:${needle};box-shadow:0 0 0 3px var(--bg);transition:left .08s;opacity:${view ? 1 : .5}`} />
            <div style={`position:absolute;left:${50 + c}%;top:0;margin-left:-6px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${needle};opacity:${view ? 1 : .5}`} />
          </div>
          <div class="num muted" style="display:flex;justify-content:space-between;font-size:.8rem"><span>♭ −50</span><span>0</span><span>+50 ♯</span></div>
        </div>

        {view && <div class="card" style="display:flex;align-items:center;justify-content:center;gap:10px;margin:18px 0 8px;min-height:52px">
          <span style={`color:${color};display:flex`}><Icon name={inTune ? 'check' : 'chevron'} size={20} /></span><b style="font-weight:600">{hint}</b></div>}

        <div style="margin-top:18px">
          <label style="margin:4px 0">Mode guidé corde par corde <input type="checkbox" checked={guided} onChange={e => { setGuided((e.target as HTMLInputElement).checked); setTarget(0); }} /></label>
          {guided && <div style={`display:grid;grid-template-columns:repeat(${tuning.midi.length},1fr);gap:8px;margin:8px 0`}>{tuning.midi.map((m, i) => {
            const n = midiName(m, s.notation);
            return <button class={'chip' + (i === target ? ' on' : '')} style="justify-content:center;min-height:52px;border-radius:10px;font-weight:600" aria-pressed={i === target} onClick={() => setTarget(i)}>{n.name}{n.octave}</button>; })}</div>}
        </div>

        <div class="card" style="padding:4px 16px">
          <label>Accordage
            <select value={s.tuning} onChange={e => { const id = (e.target as HTMLSelectElement).value; set({ tuning: id, strings: getTuning(id).midi.length >= 5 ? 5 : 4 }); setTarget(0); }}>
              {allTunings().map(t => <option value={t.id}>{t.label}</option>)}</select></label>
          {s.tuning === 'custom' && <CustomTuningEditor s={s} set={set} />}
          <label>La de référence (Hz) <input type="number" min="415" max="466" value={s.refA} onChange={e => set({ refA: Number((e.target as HTMLInputElement).value) })} /></label>
        </div>
        <p class="muted" style="font-size:.85rem">Ordre conseillé : de la corde la plus grave à la plus aiguë.</p>
      </div>
    </div>
  );
}
