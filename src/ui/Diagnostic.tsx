import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { engine, listInputs, type InputDevice } from '../audio/engine';
import { describeFreq } from '../audio/notes';
import { nux } from '../nux/plugpro';
import { useNuxStatus } from '../nux/presets';
import { db } from '../storage/db';
import { judgeAudio, judgeEnv, MARK, toDb, worst, type AudioStats, type EnvInfo, type Finding } from '../diag/verdict';
import { STATUS_MSG, useEngineStatus } from './useEngine';

const COLOR = { ok: 'var(--ok)', warn: 'var(--accent-text)', fail: 'var(--danger)' } as const;
const LABEL = { ok: 'OK', warn: 'À vérifier', fail: 'Problème' } as const;

function readEnv(): EnvInfo {
  const n = navigator as Navigator & { bluetooth?: unknown; wakeLock?: unknown; standalone?: boolean };
  return {
    secure: window.isSecureContext, getUserMedia: !!navigator.mediaDevices?.getUserMedia, audioContext: typeof AudioContext !== 'undefined',
    audioWorklet: typeof AudioWorkletNode !== 'undefined', bluetooth: !!n.bluetooth, wakeLock: !!n.wakeLock, indexedDB: typeof indexedDB !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator, standalone: matchMedia('(display-mode: standalone)').matches || !!n.standalone, ua: navigator.userAgent,
  };
}
const List = ({ fs }: { fs: Finding[] }) => <ul style="list-style:none;padding:0;margin:8px 0">{fs.map(f => <li style="display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--border)">
  <b aria-label={LABEL[f.level]} style={`color:${COLOR[f.level]};width:1.2em;flex:none`}>{MARK[f.level]}</b><span><b style="font-weight:600">{f.title}</b><span class="muted" style="display:block;font-size:.88rem">{f.detail}</span></span></li>)}</ul>;
const Badge = ({ fs }: { fs: Finding[] }) => { const w = worst(fs); return <span style={`font-size:.8rem;font-weight:600;color:${COLOR[w]}`}>{MARK[w]} {LABEL[w]}</span>; };

type Phase = 'idle' | 'silence' | 'play' | 'done';
export function Diagnostic({ s }: { s: Settings }) {
  const status = useEngineStatus(); const nst = useNuxStatus();
  const [env] = useState(readEnv); const envF = judgeEnv(env);
  const [devs, setDevs] = useState<InputDevice[]>([]); const [perm, setPerm] = useState('inconnue');
  const [phase, setPhase] = useState<Phase>('idle'); const [left, setLeft] = useState(0);
  const [lvl, setLvl] = useState(0); const [pitch, setPitch] = useState<string>('—'); const [info, setInfo] = useState<ReturnType<typeof engine.info> | null>(null);
  const [audioF, setAudioF] = useState<Finding[]>([]); const [store, setStore] = useState('…'); const [copied, setCopied] = useState('');
  const st = useRef({ lv: [] as number[], peak: 0, pe: 0, det: 0 }); const mine = useRef(false); const timers = useRef<number[]>([]);
  const phaseRef = useRef<Phase>('idle'); phaseRef.current = phase;

  const refresh = async () => setDevs(await listInputs());
  useEffect(() => {
    refresh();
    (navigator.permissions?.query({ name: 'microphone' as PermissionName }).then(p => { setPerm(p.state === 'granted' ? 'accordée' : p.state === 'denied' ? 'refusée' : 'à demander'); p.onchange = () => setPerm(p.state === 'granted' ? 'accordée' : p.state === 'denied' ? 'refusée' : 'à demander'); }) ?? Promise.resolve()).catch(() => {});
    (async () => {
      try { const e = await navigator.storage?.estimate?.(); const [a, b, c] = await Promise.all([db.sessions.count(), db.drills.count(), db.recordings.count()]);
        setStore(`${a} séances, ${b} exercices de manche, ${c} enregistrement(s)${e?.usage != null ? ` · ${(e.usage / 1048576).toFixed(1)} Mo utilisés` : ''}`); } catch { setStore('illisible (stockage bloqué ?)'); }
    })();
    const o1 = engine.onLevel(e => { setLvl(l => l * 0.6 + e.rms * 0.4); if (phaseRef.current === 'silence' || phaseRef.current === 'play') { st.current.lv.push(e.rms); st.current.peak = Math.max(st.current.peak, e.rms); } });
    const o2 = engine.onPitch(e => {
      if (phaseRef.current === 'silence' || phaseRef.current === 'play') { st.current.pe++; if (e.freq && e.clarity > 0.8) st.current.det++; }
      if (e.freq && e.clarity > 0.8) { const d = describeFreq(e.freq, s.refA, s.notation); setPitch(`${d.name}${d.octave} · ${e.freq.toFixed(1)} Hz · ${d.cents > 0 ? '+' : ''}${Math.round(d.cents)} cents`); } else if (e.level < 0.002) setPitch('—');
    });
    return () => { o1(); o2(); timers.current.forEach(clearTimeout); if (mine.current) { mine.current = false; engine.stop(); } };
  }, []);

  const tick = (sec: number, then: () => void) => { setLeft(sec); let n = sec; const id = window.setInterval(() => { n--; setLeft(n); if (n <= 0) { clearInterval(id); then(); } }, 1000); timers.current.push(id); };
  const run = async () => {
    setAudioF([]); st.current = { lv: [], peak: 0, pe: 0, det: 0 };
    if (!mine.current) { mine.current = true; await engine.start(s.inputDeviceId || undefined); }
    await refresh(); setInfo(engine.info());
    if (engine.status !== 'running') { setPhase('done'); return; }
    setPhase('silence'); const t0 = performance.now();
    tick(3, () => { const silence = { ...st.current, lv: [...st.current.lv] }; setPhase('play'); st.current = { lv: [], peak: 0, pe: silence.pe, det: 0 };
      tick(6, () => {
        const stats: AudioStats = { seconds: (performance.now() - t0) / 1000, levels: st.current.lv.length ? st.current.lv : silence.lv, peak: st.current.peak, pitchEvents: st.current.pe, detected: st.current.det };
        const noise = judgeAudio({ ...stats, levels: silence.lv, peak: 0 }, false).filter(f => /Silence|Bruit|détecteur/.test(f.title));
        const played = judgeAudio(stats, true).filter(f => !/Silence|Bruit|détecteur/.test(f.title));
        setAudioF([...noise, ...played]); setInfo(engine.info()); setPhase('done');
      }); });
  };
  const stopMine = () => { if (mine.current) { mine.current = false; engine.stop(); } setPhase('idle'); };

  const report = () => {
    const i = info ?? engine.info(); const L: string[] = [];
    L.push(`BassLab — rapport de diagnostic (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`, `Navigateur : ${env.ua}`, `Installée (PWA) : ${env.standalone ? 'oui' : 'non'} · HTTPS : ${env.secure ? 'oui' : 'non'}`, '');
    L.push('Compatibilité :', ...envF.map(f => `  [${MARK[f.level]}] ${f.title}${f.level === 'ok' ? '' : ' — ' + f.detail}`), '');
    L.push(`Micro : permission ${perm} · état moteur ${status}${engine.lastError ? ` · dernière erreur ${engine.lastError}` : ''}`, `Entrées (${devs.length}) : ${devs.map(d => d.label).join(' | ') || 'aucune'}`, `Entrée choisie : ${devs.find(d => d.id === s.inputDeviceId)?.label ?? 'par défaut'} · mode ${s.inputMode}`);
    L.push(`Audio : ${i.sampleRate ?? '?'} Hz · latence de base ${i.baseLatencyMs ?? '?'} ms · sortie ${i.outputLatencyMs ?? '?'} ms · contexte ${i.ctxState} · piste ${i.trackState}`, `Traitement navigateur : écho ${i.echoCancellation} · bruit ${i.noiseSuppression} · gain auto ${i.autoGainControl} · canaux ${i.channelCount}`);
    if (audioF.length) L.push('Test audio :', ...audioF.map(f => `  [${MARK[f.level]}] ${f.title} — ${f.detail}`));
    L.push(`Plug Pro (Bluetooth) : ${nst}${nux.connected ? ` · ${nux.deviceName} · accordeur ${nux.caps.tuner}` : ''}`, `Latence calibrée : USB ${s.latencyUsbMs} ms (${s.calibrated.usb ? 'oui' : 'non'}) · Bluetooth ${s.latencyBluetoothMs} ms (${s.calibrated.bluetooth ? 'oui' : 'non'})`, `Stockage : ${store}`);
    return L.join('\n');
  };
  const copy = async () => { const t = report(); try { await navigator.clipboard.writeText(t); setCopied('Rapport copié : collez-le dans un message.'); } catch { setCopied('Copie impossible : sélectionnez le texte ci-dessous.'); } };
  const sel = devs.find(d => d.id === s.inputDeviceId)?.label;
  const db_ = toDb(lvl);

  return (<>
    <h1>Diagnostic</h1>
    <p class="muted">Vérifie le navigateur, l'entrée audio du Plug Pro, le Bluetooth et le stockage, et dit quoi corriger. Rien n'est envoyé nulle part.</p>

    <div class="card"><div style="display:flex;justify-content:space-between"><h2 style="margin:0">1. Compatibilité</h2><Badge fs={envF} /></div><List fs={envF} /></div>

    <div class="card"><div style="display:flex;justify-content:space-between"><h2 style="margin:0">2. Entrée audio</h2>{audioF.length > 0 && <Badge fs={audioF} />}</div>
      <p class="muted" style="font-size:.88rem">Autorisation du micro : <b>{perm}</b> · {devs.length} entrée(s) détectée(s){sel ? ` · choisie : ${sel}` : ' · entrée par défaut'}</p>
      {devs.length > 0 && <p class="muted" style="font-size:.82rem;margin:0">{devs.map(d => d.label).join(' · ')}</p>}
      {STATUS_MSG[status] && <p role="alert">{STATUS_MSG[status]}</p>}
      {status === 'denied' || status === 'unavailable' ? engine.lastError && <p class="muted num" style="font-size:.8rem">Détail technique : {engine.lastError}</p> : null}
      {phase === 'idle' || phase === 'done' ? <button class="btn primary" onClick={run}>{phase === 'done' ? 'Refaire le test' : 'Lancer le test audio (9 s)'}</button> : <button class="btn" onClick={stopMine}>Arrêter</button>}
      {(phase === 'silence' || phase === 'play') && <p role="status" style="font-size:1.1rem;margin:10px 0"><b>{phase === 'silence' ? `Ne jouez pas (${left} s)` : `Jouez une note longue sur la corde de Mi (${left} s)`}</b></p>}
      <div style="height:18px;background:var(--bg);border-radius:9px;margin-top:10px;overflow:hidden" role="progressbar" aria-label="Niveau d'entrée" aria-valuemin={-90} aria-valuemax={0} aria-valuenow={Math.max(-90, db_)}><div style={`height:100%;width:${Math.max(0, Math.min(100, (db_ + 60) / 60 * 100))}%;background:${lvl > 0.7 ? 'var(--danger)' : 'var(--accent)'}`} /></div>
      <div class="num muted" style="display:flex;justify-content:space-between;font-size:.85rem;margin-top:4px"><span>{status === 'running' ? `${db_} dB` : 'entrée non ouverte'}</span><span>{pitch}</span></div>
      {audioF.length > 0 && <List fs={audioF} />}
      {info && status === 'running' && <details style="margin-top:8px"><summary class="muted">Détails techniques</summary><dl class="num" style="font-size:.82rem;display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:8px 0">
        <dt class="muted">Piste</dt><dd>{info.label || '—'} ({info.trackState})</dd><dt class="muted">Fréquence</dt><dd>{info.sampleRate} Hz</dd><dt class="muted">Latence</dt><dd>base {info.baseLatencyMs} ms · sortie {info.outputLatencyMs ?? '?'} ms</dd>
        <dt class="muted">Écho / bruit / gain auto</dt><dd>{String(info.echoCancellation)} / {String(info.noiseSuppression)} / {String(info.autoGainControl)} (tout doit être false)</dd></dl></details>}
    </div>

    <div class="card"><h2 style="margin:0 0 6px">3. Bluetooth (Plug Pro)</h2>
      {nst === 'unsupported' ? <p class="muted">Web Bluetooth indisponible sur ce navigateur (voir compatibilité). Le mode USB reste utilisable.</p> : <>
        <p>État : <b>{{ idle: 'non connecté', connecting: 'connexion…', connected: `connecté (${nux.deviceName})`, reconnecting: 'reconnexion automatique…', disconnected: 'déconnecté', error: 'erreur', unsupported: '' }[nst]}</b></p>
        {nst === 'connected' && <p class="muted" style="font-size:.88rem">Accordeur du Plug Pro : {nux.caps.tuner === 'unknown' ? 'pas encore testé' : nux.caps.tuner === 'available' ? 'répond' : 'ne répond pas'}.</p>}
        {nst === 'connected' ? <button class="btn" onClick={() => nux.disconnect()}>Déconnecter</button> : <button class="btn" disabled={nst === 'connecting' || nst === 'reconnecting'} onClick={() => nux.connect()}>Connecter le Plug Pro</button>}
        {(nst === 'error' || nst === 'disconnected') && <ul class="muted" style="font-size:.88rem"><li>Plug Pro allumé, Bluetooth activé sur le téléphone ?</li><li>Fermez l'appli NUX : une seule connexion Bluetooth à la fois.</li><li>Éteignez puis rallumez le Plug Pro, et réessayez.</li><li>Dans le sélecteur Chrome, choisissez « NUX MIGHTY PLUG ».</li></ul>}</>}
    </div>

    <div class="card"><h2 style="margin:0 0 6px">4. Données et calibration</h2>
      <p class="muted" style="font-size:.9rem">Stockage local : {store}</p>
      <p class="muted" style="font-size:.9rem">Latence : USB {s.latencyUsbMs} ms ({s.calibrated.usb ? 'calibrée' : <b>non calibrée</b>}) · Bluetooth {s.latencyBluetoothMs} ms ({s.calibrated.bluetooth ? 'calibrée' : <b>non calibrée</b>}). <a href="#/materiel">Calibrer</a></p></div>

    <div class="card"><h2 style="margin:0 0 6px">5. Rapport</h2>
      <p class="muted" style="font-size:.9rem">Si quelque chose ne marche pas, copiez ce rapport et envoyez-le-moi : il suffit pour comprendre le problème (aucune donnée personnelle, hors noms d'entrées audio).</p>
      <button class="btn" onClick={copy}>Copier le rapport</button><p role="status" class="muted">{copied}</p>
      <pre class="num" style="font-size:.72rem;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--bg);border-radius:8px;padding:10px;max-height:240px;overflow:auto" tabIndex={0} aria-label="Texte du rapport">{report()}</pre></div>
  </>);
}
