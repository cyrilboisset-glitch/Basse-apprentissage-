import type { Settings } from '../storage/settings';

/** La calibration de latence est obligatoire avant les exercices de rythme (une par mode : USB, Bluetooth). */
export const needsCalibration = (s: Settings) => !s.calibrated[s.inputMode];
export function CalibGate({ s, onSkip }: { s: Settings; onSkip: () => void }) {
  return <div class="card" role="alert" style="border-color:var(--warn)">
    <b>Calibration de latence requise</b>
    <p>Pour mesurer votre rythme à la milliseconde, l'appli doit connaître le décalage de votre matériel ({s.inputMode === 'usb' ? 'mode USB' : 'mode Bluetooth'}). Cela prend 20 secondes.</p>
    <a class="btn primary" href="#/materiel" style="display:grid;place-items:center;text-decoration:none">Calibrer maintenant</a>
    <button class="btn" style="margin-top:8px" onClick={onSkip}>Continuer sans calibration (mesures moins fiables)</button></div>;
}
