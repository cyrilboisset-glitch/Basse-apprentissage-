import { useEffect, useState } from 'preact/hooks';

/** Mode exercice : tant qu'au moins un écran le demande, la barre du bas et l'en-tête sont masqués. */
let count = 0; const subs = new Set<(f: boolean) => void>();
const emit = () => subs.forEach(l => l(count > 0));
export function useFocus(active: boolean) {
  useEffect(() => { if (!active) return; count++; emit(); return () => { count = Math.max(0, count - 1); emit(); }; }, [active]);
}
export function useFocusState() {
  const [f, setF] = useState(count > 0);
  useEffect(() => { subs.add(setF); setF(count > 0); return () => { subs.delete(setF); }; }, []);
  return f;
}
