/** Analyse pure des mesures du mode diagnostic : transforme des chiffres en consignes claires. */
export type Level = 'ok' | 'warn' | 'fail';
export interface Finding { level: Level; title: string; detail: string }

export interface AudioStats {
  seconds: number;        // durée de l'écoute
  levels: number[];       // RMS (0-1) échantillonnés
  peak: number;           // crête maximale
  pitchEvents: number;    // messages « pitch » reçus du worklet
  detected: number;       // dont une fréquence fiable (clarté > 0,8)
}

const pct = (a: number[], q: number) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
export const toDb = (x: number) => (x > 1e-6 ? Math.round(20 * Math.log10(x)) : -120);

/** `played` : l'utilisateur a-t-il joué pendant la mesure ? Sinon on ne juge que le silence/le bruit de fond. */
export function judgeAudio(st: AudioStats, played: boolean): Finding[] {
  const out: Finding[] = []; const floor = pct(st.levels, 0.2), top = pct(st.levels, 0.98);
  if (st.seconds > 1 && st.pitchEvents === 0) out.push({ level: 'fail', title: 'Le détecteur ne répond pas', detail: "Aucune analyse reçue : fermez les autres applis qui utilisent le micro, rechargez la page, puis réessayez." });
  else out.push({ level: 'ok', title: 'Le détecteur de notes tourne', detail: `${st.pitchEvents} analyses reçues en ${st.seconds.toFixed(1)} s.` });
  if (toDb(floor) > -40) out.push({ level: 'warn', title: 'Bruit de fond élevé', detail: `Silence mesuré à ${toDb(floor)} dB (idéal < −50 dB). Baissez le gain d'entrée, éloignez la source de bruit ou vérifiez que la bonne entrée est choisie.` });
  else out.push({ level: 'ok', title: 'Silence propre', detail: `Bruit de fond ${toDb(floor)} dB.` });
  if (!played) return out;
  if (top < 0.005) out.push({ level: 'fail', title: 'Aucun signal de la basse', detail: "Le niveau reste à zéro pendant que vous jouez. Vérifiez : câble USB-C, entrée audio choisie (Réglages → Matériel), volume du Plug Pro, routage USB « Dry Out »." });
  else if (top < 0.03) out.push({ level: 'warn', title: 'Signal trop faible', detail: `Niveau de crête ${toDb(top)} dB. Montez le volume du Plug Pro ou le gain du micro ; la détection des notes graves sera peu fiable.` });
  else out.push({ level: 'ok', title: 'Niveau correct', detail: `Crête ${toDb(top)} dB.` });
  if (st.peak >= 0.98) out.push({ level: 'warn', title: 'Saturation', detail: "Le signal touche le maximum : baissez le volume du Plug Pro, sinon la détection se dégrade." });
  if (top >= 0.03) {
    const r = st.detected / Math.max(1, st.pitchEvents);
    if (r < 0.05) out.push({ level: 'warn', title: 'Notes peu reconnues', detail: "Le signal est là mais presque aucune note n'est identifiée. Jouez une note isolée et tenue ; coupez les effets de réverbération/chorus du Plug Pro pour le test." });
    else out.push({ level: 'ok', title: 'Notes reconnues', detail: `${Math.round(r * 100)} % des analyses ont donné une note fiable.` });
  }
  return out;
}

export interface EnvInfo {
  secure: boolean; getUserMedia: boolean; audioContext: boolean; audioWorklet: boolean; bluetooth: boolean; wakeLock: boolean; indexedDB: boolean; serviceWorker: boolean;
  standalone: boolean; ua: string;
}
export function judgeEnv(e: EnvInfo): Finding[] {
  const f = (ok: boolean, title: string, bad: string, level: Level = 'fail'): Finding => ({ level: ok ? 'ok' : level, title, detail: ok ? 'Disponible.' : bad });
  const ios = /iPhone|iPad|iPod/.test(e.ua), firefox = /Firefox/.test(e.ua);
  return [
    f(e.secure, 'Connexion sécurisée (HTTPS)', "Le micro n'est accessible qu'en HTTPS. Ouvrez l'adresse https:// du site."),
    f(e.getUserMedia, 'Accès au micro / entrée audio', "Ce navigateur ne permet pas d'accéder au micro. Utilisez Chrome."),
    f(e.audioContext && e.audioWorklet, 'Moteur audio (AudioWorklet)', 'Navigateur trop ancien : mettez Chrome à jour.'),
    f(e.bluetooth, 'Bluetooth (Web Bluetooth)', ios ? "Impossible sur iPhone/iPad (Safari). Le mode USB fonctionne, pas le pilotage Bluetooth du Plug Pro." : firefox ? "Firefox ne gère pas Web Bluetooth : utilisez Chrome ou Edge." : "Utilisez Chrome ou Edge (Android ou ordinateur). Le reste de l'appli fonctionne.", 'warn'),
    f(e.wakeLock, "Écran maintenu allumé", "Non disponible : l'écran peut s'éteindre pendant un exercice (réglez la veille de l'appareil).", 'warn'),
    f(e.indexedDB, 'Stockage de la progression', "Stockage local bloqué (navigation privée ?) : la progression ne sera pas conservée."),
    f(e.serviceWorker, 'Mode hors ligne (PWA)', "Non actif : l'appli demandera du réseau au démarrage.", 'warn'),
  ];
}

export function worst(fs: Finding[]): Level { return fs.some(f => f.level === 'fail') ? 'fail' : fs.some(f => f.level === 'warn') ? 'warn' : 'ok'; }
export const MARK: Record<Level, string> = { ok: '✓', warn: '!', fail: '✗' };
