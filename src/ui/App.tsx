import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_SETTINGS, type Settings } from '../storage/settings';
import { Tuner } from './Tuner';
import { Materiel } from './Materiel';
import { MancheModule } from './Manche';
import { Home } from './Home';
import { CustomTuningEditor } from './CustomTuning';
import { allTunings, setCustomTuning } from '../audio/notes';
import { Session } from './Session';
import { Dashboard } from './Dashboard';
import { Placement } from './Placement';
import { Theorie } from './Theory';
import { makeIcs } from './reminder';
import { Recordings } from './Recordings';
import { AudioFile } from './AudioFile';
import { Vocabulaire } from './Vocabulaire';
import { Oreille } from './Oreille';
import { Groove } from './Groove';
import { Impro } from './Impro';
import { Jam } from './Jam';
import { Outils } from './Outils';
import { engine } from '../audio/engine';
import { useEngineStatus } from './useEngine';
import { loadSettings, saveSettings, requestPersistence, exportAll, importAll } from '../storage/db';

const TABS = [['#/', 'Séance'], ['#/manche', 'Manche'], ['#/pratique', 'Pratique'], ['#/outils', 'Outils'], ['#/reglages', 'Réglages']] as const;
const PRATIQUE = [['#/impro', 'Improvisation', '9 exercices sur backing track'], ['#/groove', 'Groove', 'Mise en place, clic qui disparaît'], ['#/jam', 'Jam', 'Backings 9 styles, grilles'],
  ['#/vocabulaire', 'Vocabulaire', '64 phrases, 12 tonalités'], ['#/oreille', 'Oreille', 'Intervalles, accords, degrés, relevé'], ['#/theorie', 'Théorie appliquée', '6 leçons courtes + exercice joué'], ['#/fichier', 'Jouer sur un morceau', 'Fichier audio : boucle A-B, ralenti'], ['#/enregistrements', 'Mes enregistrements', 'Réécoute, export WAV / WebM']] as const;
const tabOf = (h: string) => (['#/seance', '#/bord', '#/placement'].includes(h) ? '#/' : PRATIQUE.some(p => p[0] === h) || h === '#/pratique' ? '#/pratique' : h === '#/materiel' ? '#/outils' : h);
function Pratique() {
  return <><h1>Pratique</h1>{PRATIQUE.map(([h, t, d]) => <a class="card" href={h} style="display:block;text-decoration:none;color:inherit"><b style="font-size:1.2rem">{t}</b><div class="muted">{d}</div></a>)}</>;
}


function Reglages({ s, set }: { s: Settings; set: (p: Partial<Settings>) => void }) {
  const [msg, setMsg] = useState('');
  const doExport = async () => {
    const url = URL.createObjectURL(new Blob([await exportAll()], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'basslab-sauvegarde.json' });
    a.click(); URL.revokeObjectURL(url);
  };
  const doImport = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    try { await importAll(await f.text()); set(await loadSettings()); setMsg('Import réussi.'); }
    catch (err) { setMsg((err as Error).message); }
  };
  return (<>
    <h1>Réglages</h1>
    <div class="card">
      <label>Notation
        <select value={s.notation} onChange={e => set({ notation: (e.target as HTMLSelectElement).value as Settings['notation'] })}>
          <option value="fr">Do Ré Mi</option><option value="en">C D E</option></select></label>
      <label>Thème
        <select value={s.theme} onChange={e => set({ theme: (e.target as HTMLSelectElement).value as Settings['theme'] })}>
          <option value="dark">Sombre</option><option value="light">Clair</option></select></label>
      <label>Gaucher <input type="checkbox" checked={s.leftHanded} onChange={e => set({ leftHanded: (e.target as HTMLInputElement).checked })} /></label>
      <label>Cordes
        <select value={s.strings} onChange={e => { const n = Number((e.target as HTMLSelectElement).value) as 4 | 5; set({ strings: n, tuning: n === 5 ? 'standard5' : (s.tuning === 'standard5' ? 'standard4' : s.tuning) }); }}>
          <option value="4">4</option><option value="5">5</option></select></label>
      <label>Accordage <select value={s.tuning} onChange={e => { const id = (e.target as HTMLSelectElement).value; set({ tuning: id, strings: allTunings().find(t => t.id === id)!.midi.length >= 5 ? 5 : 4 }); }}>{allTunings().map(t => <option value={t.id}>{t.label}</option>)}</select></label>
      {s.tuning === 'custom' && <CustomTuningEditor s={s} set={set} />}
      <label>Cases <input type="number" min="12" max="24" value={s.frets} onChange={e => set({ frets: Number((e.target as HTMLInputElement).value) })} /></label>
      <label>La de référence (Hz) <input type="number" min="415" max="466" value={s.refA} onChange={e => set({ refA: Number((e.target as HTMLInputElement).value) })} /></label>
      <label>Tout débloquer (zones) <input type="checkbox" checked={s.unlockAll} onChange={e => set({ unlockAll: (e.target as HTMLInputElement).checked })} /></label>
      <label>Durée de séance
        <select value={s.sessionMinutes} onChange={e => set({ sessionMinutes: Number((e.target as HTMLSelectElement).value) as Settings['sessionMinutes'] })}>
          <option value="10">10 min</option><option value="20">20 min</option><option value="30">30 min</option></select></label>
      <label>Taille du texte <input type="range" min="0.9" max="1.5" step="0.05" value={s.fontScale} onInput={e => set({ fontScale: Number((e.target as HTMLInputElement).value) })} /></label>
    </div>
    <div class="card"><h2>Rappel quotidien</h2>
      <label>Heure <input type="time" value={s.reminderTime} onChange={e => set({ reminderTime: (e.target as HTMLInputElement).value })} /></label>
      <button class="btn" disabled={!s.reminderTime} onClick={() => { const url = URL.createObjectURL(new Blob([makeIcs(s.reminderTime, s.sessionMinutes)], { type: 'text/calendar' })); Object.assign(document.createElement('a'), { href: url, download: 'basslab-rappel.ics' }).click(); URL.revokeObjectURL(url); }}>Ajouter à mon agenda (.ics)</button>
      <p class="muted">Une appli web ne peut pas envoyer de notification à heure fixe sans serveur (et rien ne doit quitter votre téléphone). Le fichier .ics crée un événement quotidien avec alarme dans votre agenda.</p></div>
    <div class="card">
      <button class="btn" onClick={doExport}>Exporter mes données</button>
      <label>Importer <input type="file" accept="application/json" onChange={doImport} /></label>
      <p class="muted" role="status">{msg}</p>
    </div>
  </>);
}

export function App() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS); const [ready, setReady] = useState(false);
  const [tuner, setTuner] = useState(false);
  setCustomTuning(s.customTuning); const est = useEngineStatus();
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {
    // Les réglages enregistrés sont chargés AVANT d'afficher quoi que ce soit : sinon un réglage modifié très tôt serait écrasé par le chargement tardif.
    loadSettings().then(x => { setS(x); setReady(true); }, () => setReady(true)); requestPersistence();
    const h = () => setHash(location.hash || '#/');
    addEventListener('hashchange', h); h(); // resynchronise si le hash a changé avant l'abonnement
    return () => removeEventListener('hashchange', h);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.style.setProperty('--fs', String(s.fontScale));
  }, [s.theme, s.fontScale]);
  const set = (p: Partial<Settings>) => setS(prev => { const n = { ...prev, ...p }; saveSettings(n); return n; });

  if (!ready) return <main aria-busy="true" aria-label="Chargement" />;
  let page;
  switch (hash) {
    case '#/manche': page = <MancheModule s={s} />; break;
    case '#/impro': page = <Impro s={s} />; break;
    case '#/seance': page = <Session s={s} onClose={() => { location.hash = '#/'; }} />; break;
    case '#/bord': page = <Dashboard s={s} />; break;
    case '#/placement': page = <Placement s={s} />; break;
    case '#/theorie': page = <Theorie s={s} />; break;
    case '#/fichier': page = <AudioFile />; break;
    case '#/enregistrements': page = <Recordings s={s} />; break;
    case '#/pratique': page = <Pratique />; break;
    case '#/vocabulaire': page = <Vocabulaire s={s} />; break;
    case '#/oreille': page = <Oreille s={s} />; break;
    case '#/groove': page = <Groove s={s} />; break;
    case '#/jam': page = <Jam s={s} />; break;
    case '#/outils': page = <Outils />; break;
    case '#/materiel': page = <Materiel s={s} set={set} />; break;
    case '#/reglages': page = <Reglages s={s} set={set} />; break;
    default: page = <Home s={s} set={set} />;
  }
  return (<>
    {est === 'disconnected' && <div role="alert" style="position:sticky;top:0;z-index:20;background:var(--danger);color:#fff;padding:12px;border-radius:0 0 12px 12px;margin:0 -16px">
      Entrée audio déconnectée : exercice en pause. Rebranchez le Plug Pro (reconnexion automatique).
      <button class="btn" style="margin-top:8px;border-color:#fff;color:#fff;min-height:44px" onClick={() => engine.reconnect(s.inputDeviceId || undefined)}>Réessayer maintenant</button></div>}
    <main>{page}</main>
    <button class="tuner-fab" aria-label="Accordeur" onClick={() => setTuner(true)}>♩</button>
    {tuner && <Tuner s={s} set={set} onClose={() => setTuner(false)} />}
    <nav aria-label="Navigation principale">
      {TABS.map(([h, label]) => <a href={h} aria-current={tabOf(hash) === h ? 'page' : undefined}>{label}</a>)}
    </nav>
  </>);
}
