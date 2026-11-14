import { useEffect, useRef, useState } from 'preact/hooks';
import { engine, guessUsbInput, listInputs, type InputDevice } from '../audio/engine';
import { Metronome } from '../audio/metronome';
import { detectOnsets, estimateLatencyMs, type LevelFrame } from '../audio/onset';
import type { Settings } from '../storage/settings';
import { STATUS_MSG, useEngineStatus } from './useEngine';

export function Materiel({ s, set }: { s: Settings; set: (p: Partial<Settings>) => void }) {
  const status = useEngineStatus();
  const [devs, setDevs] = useState<InputDevice[]>([]);
  const [level, setLevel] = useState(0);
  const [calib, setCalib] = useState<'idle' | 'run' | 'done'>('idle');
  const [result, setResult] = useState('');
  const frames = useRef<LevelFrame[]>([]); const rec = useRef(false);

  const refresh = async () => setDevs(await listInputs());
  useEffect(() => { refresh(); return () => engine.stop(); }, []);
  useEffect(() => engine.onLevel(e => { setLevel(l => l * 0.7 + e.rms * 0.3); if (rec.current) frames.current.push(e); }), []);

  const start = async () => {
    await engine.start(s.inputDeviceId || undefined); await refresh();
    if (!s.inputDeviceId) { const g = guessUsbInput(await listInputs()); if (g && s.inputMode === 'usb') set({ inputDeviceId: g.id }); }
  };

  const calibrate = async () => {
    if (engine.status !== 'running') await start();
    const ctx = await engine.getContext();
    setCalib('run'); setResult('Jouez une note courte sur chaque clic (8 clics)…');
    frames.current = []; rec.current = true;
    const clicks: number[] = []; let n = 0;
    const m = new Metronome(ctx, { bpm: 80, beatsPerBar: 4, subdivision: 1, accent: false }, (_b, t) => { clicks.push(t); if (++n >= 10) setTimeout(finish, 1500); });
    const finish = () => {
      m.stop(); rec.current = false;
      const lat = estimateLatencyMs(clicks.slice(2), detectOnsets(frames.current));
      if (lat === null) setResult("Mesure impossible : pas assez de notes détectées. Jouez plus fort et réessayez.");
      else { set(s.inputMode === 'usb' ? { latencyUsbMs: lat } : { latencyBluetoothMs: lat }); setResult(`Décalage mesuré : ${lat} ms (enregistré pour le mode ${s.inputMode === 'usb' ? 'USB' : 'Bluetooth'}).`); }
      setCalib('done');
    };
    m.start();
  };

  return (<>
    <h1>Matériel</h1>
    <div class="card">
      <label>Mode
        <select value={s.inputMode} onChange={e => set({ inputMode: (e.target as HTMLSelectElement).value as Settings['inputMode'] })}>
          <option value="usb">USB (Plug Pro branché) — recommandé</option>
          <option value="bluetooth">Bluetooth + micro du téléphone</option></select></label>
      {s.inputMode === 'bluetooth' && <p class="muted" role="note">⚠ Le micro du téléphone capte aussi la pièce et le Bluetooth ajoute ~200 ms de retard : accordeur et mesures de rythme moins fiables. Calibrez la latence.</p>}
      <label>Entrée audio
        <select value={s.inputDeviceId} onChange={e => set({ inputDeviceId: (e.target as HTMLSelectElement).value })}>
          <option value="">Par défaut</option>{devs.map(d => <option value={d.id}>{d.label}</option>)}</select></label>
      <button class="btn" onClick={engine.status === 'running' ? () => engine.stop() : start}>{status === 'running' ? "Arrêter l'écoute" : "Tester l'entrée"}</button>
      {STATUS_MSG[status] && <p role="alert">{STATUS_MSG[status]}</p>}
      <div style="height:20px;background:var(--bg);border-radius:10px;margin-top:12px;overflow:hidden" aria-label="Niveau d'entrée">
        <div style={`height:100%;width:${Math.min(100, level * 400)}%;background:var(--accent)`}/></div>
      <p class="muted">Dans le Plug Pro, choisissez le routage USB « Dry Out » (basse seule) ; évitez « Loopback », qui renverrait le backing dans l'entrée.</p>
    </div>
    <div class="card">
      <h2>Calibration de latence</h2>
      <p class="muted">Réglée : USB {s.latencyUsbMs} ms · Bluetooth {s.latencyBluetoothMs} ms. À faire avant les exercices de rythme, casque branché.</p>
      <button class="btn" disabled={calib === 'run'} onClick={calibrate}>Calibrer ({s.inputMode === 'usb' ? 'USB' : 'Bluetooth'})</button>
      <p role="status">{result}</p>
    </div>
  </>);
}
