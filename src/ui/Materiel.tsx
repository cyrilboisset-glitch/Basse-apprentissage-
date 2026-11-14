import { useEffect, useRef, useState } from 'preact/hooks';
import { engine, guessUsbInput, listInputs, type InputDevice } from '../audio/engine';
import { Metronome } from '../audio/metronome';
import { detectOnsets, estimateLatencyMs, type LevelFrame } from '../audio/onset';
import type { Settings } from '../storage/settings';
import { STATUS_MSG, useEngineStatus } from './useEngine';
import { nux } from '../nux/plugpro';
import { CATEGORIES, useNuxStatus } from '../nux/presets';

export function Materiel({ s, set }: { s: Settings; set: (p: Partial<Settings>) => void }) {
  const status = useEngineStatus();
  const [devs, setDevs] = useState<InputDevice[]>([]);
  const [level, setLevel] = useState(0);
  const [calib, setCalib] = useState<'idle' | 'run' | 'done'>('idle');
  const [result, setResult] = useState('');
  const nst = useNuxStatus(); const [vol, setVol] = useState(80); const [usb, setUsb] = useState<'dryOut' | 'normal' | 'reamp'>('dryOut'); const [note, setNote] = useState('');
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
      <h2>Plug Pro (Bluetooth MIDI)</h2>
      {nst === 'unsupported' ? <p role="note">Web Bluetooth indisponible : utilisez Chrome sur Android, en HTTPS. Le contrôle du Plug Pro est désactivé ; le reste de l'appli fonctionne.</p> : <>
        <p class="muted">État : {{ idle: 'non connecté', connecting: 'connexion…', connected: `connecté (${nux.deviceName})`, reconnecting: 'reconnexion automatique…', disconnected: 'déconnecté (échec de reconnexion)', error: 'erreur de connexion', unsupported: '' }[nst]}</p>
        {nst === 'connected' ? <button class="btn" onClick={() => nux.disconnect()}>Déconnecter</button> : <button class="btn" disabled={nst === 'connecting' || nst === 'reconnecting'} onClick={() => nux.connect()}>Connecter le Plug Pro</button>}
        {nst === 'connected' && <>
          <label>Volume du preset <span>{vol} %</span></label>
          <input type="range" style="width:100%" min="0" max="100" value={vol} aria-label="Volume du Plug Pro" onInput={e => { const v = Number((e.target as HTMLInputElement).value); setVol(v); nux.setVolume(v); }} />
          <p class="muted">Échelle en dB propre au Plug Pro, non vérifiée : l'appli envoie un niveau 0-127 proportionnel.</p>
          <label>Routage USB <select value={usb} onChange={e => { const v = (e.target as HTMLSelectElement).value as typeof usb; setUsb(v); nux.setUsbMode(v); }}>
            <option value="dryOut">Dry Out (recommandé)</option><option value="normal">Normal</option><option value="reamp">Re-amp</option></select></label>
          <p class="muted">Commande déduite du code de Mightier Amp, non testée sur matériel. Vérifiez sur le Plug Pro. Pour Loopback, utilisez l'appli NUX.</p>
          <div class="muted">Tester un preset :</div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:6px 0">{[1, 2, 3, 4, 5, 6, 7].map(n => <button class="btn" style="min-height:48px" onClick={async () => setNote((await nux.setPreset(n)) ? `Preset ${n} envoyé.` : 'Envoi impossible.')}>{n}</button>)}</div>
          <p role="status" class="muted">{note}</p>
          <label>Changer de preset automatiquement <input type="checkbox" checked={s.nuxAuto} onChange={e => set({ nuxAuto: (e.target as HTMLInputElement).checked })} /></label>
          {s.nuxAuto && CATEGORIES.map(([k, l]) => <label>{l} <select value={s.presetMap[k] ?? 0} onChange={e => set({ presetMap: { ...s.presetMap, [k]: Number((e.target as HTMLSelectElement).value) } })}><option value="0">Ne pas changer</option>{[1, 2, 3, 4, 5, 6, 7].map(n => <option value={n}>Preset {n}</option>)}</select></label>)}
          <p class="muted">Accordeur du Plug Pro : {nux.caps.tuner === 'unavailable' ? 'non disponible (firmware ancien ?)' : nux.caps.tuner === 'available' ? 'disponible' : 'à tester depuis l\'accordeur (bouton ♩)'}.</p></>}
      </>}
    </div>
    <div class="card">
      <h2>Calibration de latence</h2>
      <p class="muted">Réglée : USB {s.latencyUsbMs} ms · Bluetooth {s.latencyBluetoothMs} ms. À faire avant les exercices de rythme, casque branché.</p>
      <button class="btn" disabled={calib === 'run'} onClick={calibrate}>Calibrer ({s.inputMode === 'usb' ? 'USB' : 'Bluetooth'})</button>
      <p role="status">{result}</p>
    </div>
  </>);
}
