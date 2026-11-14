import { useEffect, useState } from 'preact/hooks';
const Q = '(orientation: landscape) and (max-height: 520px)';
/** Vrai quand le téléphone est tenu en paysage (écran bas). */
export function useLandscape() {
  const [v, setV] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(Q).matches);
  useEffect(() => { const m = matchMedia(Q), h = () => setV(m.matches); m.addEventListener('change', h); h(); return () => m.removeEventListener('change', h); }, []);
  return v;
}
