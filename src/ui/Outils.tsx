import { useEffect, useRef, useState } from 'preact/hooks';
import { engine } from '../audio/engine';
import { Metronome, defaultMetronome, type MetronomeOptions } from '../audio/metronome';
import { DrumBox } from './DrumMachine';

export function Outils() {
  const [o, setO] = useState<MetronomeOptions>(defaultMetronome);
  const [on, setOn] = useState(false); const [beat, setBeat] = useState(-1);
  const m = useRef<Metronome | null>(null); const opts = useRef(o); opts.current = o;
  useEffect(() => { if (m.current) m.current.opts = o; }, [o]);
  useEffect(() => () => { m.current?.stop(); }, []);

  const toggle = async () => {
    if (on) { m.current?.stop(); setOn(false); setBeat(-1); return; }
    const ctx = await engine.getContext();
    m.current = new Metronome(ctx, opts.current, (b, t) => setTimeout(() => setBeat(b), Math.max(0, (t - ctx.currentTime) * 1000)));
    m.current.start(); setOn(true);
  };
  const up = (p: Partial<MetronomeOptions>) => setO(prev => ({ ...prev, ...p }));
  return (<>
    <h1>Métronome</h1>
    <div class="card" style="text-align:center">
      <div style="display:flex;gap:8px;justify-content:center;margin:8px 0" aria-hidden="true">
        {Array.from({ length: o.beatsPerBar }, (_, i) => <div style={`width:36px;height:36px;border-radius:50%;background:${beat === i ? (i === 0 ? 'var(--danger)' : 'var(--accent)') : 'var(--border)'}`}/>)}
      </div>
      <div style="font-size:3.5rem;font-weight:800">{o.bpm}<small style="font-size:1.2rem"> BPM</small></div>
      <input type="range" min="30" max="240" value={o.bpm} style="width:100%" aria-label="Tempo" onInput={e => up({ bpm: Number((e.target as HTMLInputElement).value) })} />
      <div style="display:flex;gap:8px"><button class="btn" onClick={() => up({ bpm: Math.max(30, o.bpm - 1) })}>−1</button><button class="btn" onClick={() => up({ bpm: Math.min(240, o.bpm + 1) })}>+1</button></div>
      <label>Temps par mesure <select value={o.beatsPerBar} onChange={e => up({ beatsPerBar: Number((e.target as HTMLSelectElement).value) })}>{[2, 3, 4, 5, 6, 7, 9, 12].map(n => <option>{n}</option>)}</select></label>
      <label>Subdivision <select value={o.subdivision} onChange={e => up({ subdivision: Number((e.target as HTMLSelectElement).value) as 1 | 2 | 3 | 4 })}>
        <option value="1">Noires</option><option value="2">Croches</option><option value="3">Triolets</option><option value="4">Doubles</option></select></label>
      <label>Accentuer le 1 <input type="checkbox" checked={o.accent} onChange={e => up({ accent: (e.target as HTMLInputElement).checked })} /></label>
      <label>Clic qui disparaît <select value={o.muteBars ? `${o.muteBars.play}/${o.muteBars.of}` : ''} onChange={e => { const v = (e.target as HTMLSelectElement).value; up({ muteBars: v ? { play: Number(v.split('/')[0]), of: Number(v.split('/')[1]) } : undefined }); }}>
        <option value="">Non</option><option value="1/2">1 mesure sur 2</option><option value="1/4">1 sur 4</option><option value="1/8">1 sur 8</option></select></label>
      <button class="btn primary" onClick={toggle}>{on ? 'Arrêter' : 'Démarrer'}</button>
    </div>
    <DrumBox />
    <a class="btn" href="#/materiel" style="display:block;text-align:center;line-height:56px;text-decoration:none">Matériel et calibration</a>
    <a class="btn" href="#/manche" style="display:block;text-align:center;line-height:56px;text-decoration:none;margin-top:8px">Manche de référence (gammes, arpèges)</a>
    <a class="btn" href="#/jam" style="display:block;text-align:center;line-height:56px;text-decoration:none;margin-top:8px">Éditeur de grilles (Jam → grille personnalisée)</a>
  </>);
}
