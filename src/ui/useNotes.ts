import { useEffect, useRef, useState } from 'preact/hooks';
import { engine } from '../audio/engine';
import { NoteTracker, type NoteEvent } from '../audio/noteTracker';
import { freqToMidi } from '../audio/notes';

/** Note actuellement jouée (pour la surbrillance) + callback d'événements de notes datés. */
export function useNotes(active: boolean, refA: number, onNote?: (e: NoteEvent) => void, deviceId?: string) {
  const [live, setLive] = useState<number | null>(null);
  const cb = useRef(onNote); cb.current = onNote;
  useEffect(() => {
    if (!active) { setLive(null); return; }
    engine.start(deviceId || undefined);
    const tr = new NoteTracker(e => cb.current?.(e), refA);
    let last = 0;
    const o1 = engine.onLevel(e => tr.feedLevel(e.t, e.rms));
    const o2 = engine.onPitch(e => {
      tr.feedPitch(e);
      if (e.freq && e.clarity > 0.8) { last = e.t; setLive(Math.round(freqToMidi(e.freq, refA))); }
      else if (e.t - last > 0.5) setLive(null);
    });
    return () => { o1(); o2(); engine.stop(); };
  }, [active, refA, deviceId]);
  return live;
}
