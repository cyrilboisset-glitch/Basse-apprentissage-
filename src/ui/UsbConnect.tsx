import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { engine, guessUsbInput, listInputs } from '../audio/engine';
import { describeFreq } from '../audio/notes';
import { useEngineStatus } from './useEngine';

type Step = 'idle' | 'search' | 'missing' | 'wait' | 'ok' | 'denied';

/** Connexion USB en un geste : autorise le micro, repère l'interface du Plug Pro, la sélectionne et vérifie qu'elle reçoit la basse. */
export function UsbConnect({ s, set }: { s: Settings; set: (p: Partial<Settings>) => void }) {
  const status = useEngineStatus(); const [step, setStep] = useState<Step>('idle'); const [name, setName] = useState(''); const [others, setOthers] = useState<string[]>([]);
  const [lvl, setLvl] = useState(0); const [note, setNote] = useState(''); const mine = useRef(false); const stepRef = useRef(step); stepRef.current = step; const timer = useRef(0);
  const release = () => { if (mine.current) { mine.current = false; engine.stop(); } };
  useEffect(() => release, []);
  useEffect(() => { const o1 = engine.onLevel(e => { setLvl(l => l * 0.6 + e.rms * 0.4); if (stepRef.current === 'wait' && e.rms > 0.02) setStep('ok'); });
    const o2 = engine.onPitch(e => { if (e.freq && e.clarity > 0.8) { const d = describeFreq(e.freq, s.refA, s.notation); setNote(`${d.name}${d.octave}`); } }); return () => { o1(); o2(); }; }, []);
  /* Brancher le câble pendant que l'écran est ouvert : on relance tout seul. */
  useEffect(() => { const h = () => { if (stepRef.current === 'missing') connect(); }; try { navigator.mediaDevices?.addEventListener('devicechange', h); } catch { /* */ } return () => { try { navigator.mediaDevices?.removeEventListener('devicechange', h); } catch { /* */ } }; }, []);

  const connect = async () => {
    setStep('search'); release(); mine.current = true;
    try { await engine.start(undefined); } catch { /* statut géré ci-dessous */ }
    if (engine.status === 'denied') { setStep('denied'); release(); return; }
    const devs = await listInputs(); const g = guessUsbInput(devs);
    if (!g) { setOthers(devs.map(d => d.label)); setStep('missing'); release(); return; }
    setName(g.label); set({ inputMode: 'usb', inputDeviceId: g.id });
    release(); mine.current = true; await engine.start(g.id);
    if (engine.status !== 'running') { setStep('missing'); setOthers(devs.map(d => d.label)); release(); return; }
    setStep('wait'); clearTimeout(timer.current);
  };

  return (<div class="card accent">
    <h2 style="margin:0 0 6px">Connecter le Plug Pro (USB)</h2>
    {step === 'idle' && <><p class="muted" style="margin:0 0 10px">Branchez le câble USB-C entre le Plug Pro (allumé) et l'appareil, puis appuyez :</p><button class="btn primary" onClick={connect}>Connecter</button></>}
    {step === 'search' && <p role="status">Recherche du Plug Pro…</p>}
    {step === 'denied' && <><p role="alert">Le micro est refusé. Dans Chrome : cadenas à gauche de l'adresse → Autorisations → Micro → Autoriser.</p><button class="btn primary" onClick={connect}>Réessayer</button></>}
    {step === 'missing' && <><p role="alert"><b>Plug Pro introuvable.</b> L'appareil ne voit que : {others.join(', ') || 'aucune entrée'}.</p>
      <ol style="padding-left:1.2em;margin:6px 0"><li>Le Plug Pro est allumé.</li><li>Câble USB-C <b>de données</b> (pas un câble de charge seule).</li><li>Sur Android : adaptateur OTG si besoin. Rebranchez le câble : la recherche reprend toute seule.</li></ol>
      <button class="btn primary" onClick={connect}>Chercher à nouveau</button></>}
    {(step === 'wait' || step === 'ok') && <>
      <p style="margin:0 0 6px">Interface détectée : <b>{name}</b> <span class="ok">✓</span></p>
      <div style="height:16px;background:var(--bg);border-radius:8px;overflow:hidden" role="progressbar" aria-label="Niveau d'entrée" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(lvl * 400))}><div style={`height:100%;width:${Math.min(100, lvl * 400)}%;background:var(--accent)`} /></div>
      {step === 'wait' ? <p role="status" style="margin:8px 0 0"><b>Jouez une note sur la basse</b> pour vérifier que le son arrive. Rien ne bouge ? Montez le volume du Plug Pro.</p>
        : <p role="status" class="ok" style="margin:8px 0 0"><b>✓ Connecté : la basse est reçue{note ? ` (${note})` : ''}.</b> Vous pouvez commencer.</p>}
      <button class="btn" style="margin-top:8px" onClick={() => { release(); setStep('idle'); }}>Terminer</button></>}
    {status === 'disconnected' && step !== 'idle' && <p role="alert">Câble débranché : rebranchez-le et appuyez sur Connecter.</p>}
  </div>);
}
