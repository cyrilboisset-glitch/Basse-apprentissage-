import type { Settings } from '../storage/settings';
import { midiName } from '../audio/notes';

/** Une liste déroulante par corde (du grave à l'aigu), de Si0 (23) à Ré4 (62), plus ajout/retrait d'une corde. */
export function CustomTuningEditor({ s, set }: { s: Settings; set: (p: Partial<Settings>) => void }) {
  const opts = Array.from({ length: 40 }, (_, i) => 23 + i);
  const upd = (i: number, m: number) => set({ customTuning: s.customTuning.map((x, k) => (k === i ? m : x)) });
  return <div class="card" aria-label="Accordage personnalisé"><div class="muted">Accordage personnalisé (du grave à l'aigu)</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">{s.customTuning.map((m, i) => <label style="display:block;margin:4px 0"><span class="muted">Corde {i + 1}</span>
      <select value={m} aria-label={`Corde ${i + 1}`} onChange={e => upd(i, Number((e.target as HTMLSelectElement).value))}>{opts.map(o => <option value={o}>{midiName(o, s.notation).name}{midiName(o).octave}</option>)}</select></label>)}</div>
    <div style="display:flex;gap:8px"><button class="btn" style="min-height:44px" disabled={s.customTuning.length >= 6} onClick={() => set({ customTuning: [...s.customTuning, s.customTuning[s.customTuning.length - 1] + 5] })}>+ corde aiguë</button>
      <button class="btn" style="min-height:44px" disabled={s.customTuning.length <= 4} onClick={() => set({ customTuning: s.customTuning.slice(0, -1) })}>− corde</button></div></div>;
}
