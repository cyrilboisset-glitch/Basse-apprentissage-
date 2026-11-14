import { useEffect, useState } from 'preact/hooks';
import { engine, type EngineStatus } from '../audio/engine';

export function useEngineStatus(): EngineStatus {
  const [s, setS] = useState(engine.status);
  useEffect(() => engine.onStatus(setS), []);
  return s;
}
export const STATUS_MSG: Record<EngineStatus, string> = {
  idle: '', starting: 'Démarrage…', running: '',
  denied: "Accès au micro refusé. Dans Chrome : icône cadenas (barre d'adresse) → Autorisations → Micro → Autoriser, puis réessayez.",
  unavailable: "Entrée audio indisponible. Vérifiez que le Plug Pro est branché en USB-C (ou autorisez le micro).",
  disconnected: 'Entrée audio déconnectée. Rebranchez le câble puis appuyez sur Réessayer.',
};
