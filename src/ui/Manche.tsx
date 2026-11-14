import { useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { getTuning, midiName } from '../audio/notes';
import { ARPEGGIOS } from '../theory/chords';
import { INTERVAL_NAMES, SCALES, getScale, pc } from '../theory/scales';
import { allPositions } from '../theory/fretboard';
import { Fretboard, ROLE_COLOR, ROLE_NAME, type Mark } from './Fretboard';
import { useNotes } from './useNotes';
import { Exercices, Carte } from './MancheExercices';

const ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function Explorer({ s }: { s: Settings }) {
  const tuning = getTuning(s.tuning).midi;
  const [root, setRoot] = useState(9);
  const [kind, setKind] = useState('minorPent');
  const [label, setLabel] = useState<'names' | 'degrees' | 'none'>('degrees');
  const [live, setLive] = useState(false);
  const [range, setRange] = useState<[number, number]>([0, 12]);
  const liveNote = useNotes(live, s.refA, undefined, s.inputDeviceId);

  const isArp = kind.startsWith('arp:');
  const steps = isArp ? ARPEGGIOS.find(a => a.id === kind.slice(4))!.steps : getScale(kind).steps;
  const marks = new Map<string, Mark>();
  for (const p of allPositions(tuning, s.frets)) {
    const i = pc(p.midi - root);
    if (!steps.includes(i)) continue;
    const role = i === 0 ? 'root' : [3, 4].includes(i) ? 'third' : [6, 7, 8].includes(i) ? 'fifth' : [10, 11].includes(i) ? 'seventh' : 'extension';
    marks.set(`${p.string}:${p.fret}`, { role, label: label === 'none' ? '' : label === 'names' ? midiName(p.midi, s.notation).name : INTERVAL_NAMES[i] });
  }
  const sel = (e: Event) => (e.target as HTMLSelectElement).value;
  return (<>
    <Fretboard tuning={tuning} from={range[0]} to={Math.min(range[1], s.frets)} leftHanded={s.leftHanded} marks={marks} live={liveNote} />
    <Legend />
    <div class="card">
      <label>Tonique <select value={root} onChange={e => setRoot(Number(sel(e)))}>{ROOTS.map(r => <option value={r}>{midiName(r + 12, s.notation).name}</option>)}</select></label>
      <label>Type <select value={kind} onChange={e => setKind(sel(e))}>
        <optgroup label="Gammes">{SCALES.map(x => <option value={x.id}>{x.name}</option>)}</optgroup>
        <optgroup label="Arpèges">{ARPEGGIOS.map(x => <option value={'arp:' + x.id}>Arpège {x.suffix || 'majeur'}</option>)}</optgroup></select></label>
      <label>Affichage <select value={label} onChange={e => setLabel(sel(e) as typeof label)}>
        <option value="degrees">Degrés</option><option value="names">Noms de notes</option><option value="none">Rien (mémoire)</option></select></label>
      <label>Cases <select value={range.join('-')} onChange={e => setRange(sel(e).split('-').map(Number) as [number, number])}>
        <option value="0-12">0 – 12</option><option value="0-5">0 – 5</option><option value="5-9">5 – 9</option><option value="9-12">9 – 12</option><option value="12-17">12 – 17</option><option value="12-24">12 – 24</option></select></label>
      <label>Note jouée en direct <input type="checkbox" checked={live} onChange={e => setLive((e.target as HTMLInputElement).checked)} /></label>
    </div>
    <p class="muted">Astuce : tournez le téléphone en paysage pour un manche plus grand.</p>
  </>);
}

export function Legend() {
  return <div style="display:flex;flex-wrap:wrap;gap:12px;margin:12px 0" aria-label="Légende">
    {['root', 'third', 'fifth', 'seventh', 'extension'].map(r => <span><span style={`display:inline-block;width:14px;height:14px;background:${ROLE_COLOR[r]};border-radius:${r === 'root' ? '50%' : r === 'fifth' ? '3px' : r === 'third' ? '2px;transform:rotate(45deg)' : '50%'}`} /> {ROLE_NAME[r]}</span>)}
  </div>;
}

export function MancheModule({ s }: { s: Settings }) {
  const [tab, setTab] = useState<'ex' | 'explorer' | 'carte'>('ex');
  return (<>
    <h1>Manche</h1>
    <div style="display:flex;gap:8px;margin-bottom:8px" role="tablist">
      {([['ex', 'Exercices'], ['explorer', 'Explorer'], ['carte', 'Carte']] as const).map(([k, l]) =>
        <button role="tab" aria-selected={tab === k} class="btn" style={tab === k ? 'background:var(--accent);color:var(--on-accent)' : ''} onClick={() => setTab(k)}>{l}</button>)}
    </div>
    {tab === 'ex' ? <Exercices s={s} /> : tab === 'explorer' ? <Explorer s={s} /> : <Carte s={s} />}
  </>);
}
