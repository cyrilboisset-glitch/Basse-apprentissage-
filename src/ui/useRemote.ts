import { useEffect, useRef } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { footswitch } from '../nux/footswitch';
import { CommandDetector } from '../audio/command';
import { useNotes } from './useNotes';

const stack: (() => void)[] = [];
footswitch.onTrigger = () => stack[stack.length - 1]?.();

/**
 * Démarrer/arrêter sans toucher l'écran : footswitch BLE MIDI (si connecté) et/ou note commande
 * (réglages). `toggle` est appelé à chaque commande.
 */
export function useRemote(toggle: () => void, s: Settings) {
  const ref = useRef(toggle); ref.current = toggle;
  const det = useRef(new CommandDetector(s.cmdNote)); det.current.cmdNote = s.cmdNote;
  useEffect(() => { const h = () => ref.current(); stack.push(h); return () => { const i = stack.lastIndexOf(h); if (i >= 0) stack.splice(i, 1); }; }, []);
  useNotes(s.cmdNoteOn, s.refA, e => { if (det.current.feed(e.t, e.midi)) ref.current(); }, s.inputDeviceId);
}
