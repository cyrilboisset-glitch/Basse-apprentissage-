import { useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { getTuning, midiName } from '../audio/notes';
import { ARPEGGIOS } from '../theory/chords';
import { INTERVAL_NAMES, SCALES, getScale, pc } from '../theory/scales';
import { allPositions } from '../theory/fretboard';
import { Fretboard, RoleGlyph, ROLE_NAME, type Mark } from './Fretboard';
import { useNotes } from './useNotes';
import { Exercices, Carte } from './MancheExercices';
import { Icon } from './Icon';
import { useFocus, useFocusState } from './focus';
import { useLandscape } from './useLandscape';

const ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function Explorer({ s, onBack }: { s: Settings; onBack?: () => void }) {
  const tuning = getTuning(s.tuning).midi;
  const full = useLandscape();
  useFocus(full);
  const [root, setRoot] = useState(9);
  const [kind, setKind] = useState('minorPent');
  const [label, setLabel] = useState<'names' | 'degrees' | 'none'>('degrees');
  const [live, setLive] = useState(false);
  const [range, setRange] = useState<[number, number]>(() => (typeof innerWidth !== 'undefined' && innerWidth < 600 ? [0, 5] : [0, 12]));
  const [panel, setPanel] = useState(false);
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
  const title = `${midiName(root + 12, s.notation).name} ${isArp ? 'arpège ' + (ARPEGGIOS.find(a => a.id === kind.slice(4))!.suffix || 'majeur') : getScale(kind).name.toLowerCase()}`;
  const neck = <Fretboard tuning={tuning} from={range[0]} to={Math.min(range[1], s.frets)} leftHanded={s.leftHanded} marks={marks} live={liveNote} />;
  const controls = (<div class="card" style={full ? 'margin:0;border:0;border-radius:0;background:transparent' : ''}>
    <label>Tonique <select value={root} onChange={e => setRoot(Number(sel(e)))}>{ROOTS.map(r => <option value={r}>{midiName(r + 12, s.notation).name}</option>)}</select></label>
    <label>Type <select value={kind} onChange={e => setKind(sel(e))}>
      <optgroup label="Gammes">{SCALES.map(x => <option value={x.id}>{x.name}</option>)}</optgroup>
      <optgroup label="Arpèges">{ARPEGGIOS.map(x => <option value={'arp:' + x.id}>Arpège {x.suffix || 'majeur'}</option>)}</optgroup></select></label>
    <label>Affichage <select value={label} onChange={e => setLabel(sel(e) as typeof label)}>
      <option value="degrees">Degrés</option><option value="names">Noms de notes</option><option value="none">Rien (mémoire)</option></select></label>
    <label>Cases <select value={range.join('-')} onChange={e => setRange(sel(e).split('-').map(Number) as [number, number])}>
      <option value="0-5">0 – 5</option><option value="5-9">5 – 9</option><option value="9-12">9 – 12</option><option value="12-17">12 – 17</option><option value="0-12">0 – 12</option><option value="12-24">12 – 24</option></select></label>
    <label>Note jouée en direct <input type="checkbox" checked={live} onChange={e => setLive((e.target as HTMLInputElement).checked)} /></label>
  </div>);

  if (full) return (
    <div style="position:fixed;inset:0;z-index:8;background:var(--bg);display:flex;flex-direction:column">
      <div style="height:56px;flex-shrink:0;display:flex;align-items:center;gap:4px;padding:0 8px">
        <button class="icon-btn" aria-label="Retour" onClick={onBack}><Icon name="back" /></button>
        <div style="flex:1;min-width:0"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{title}</div><div class="muted" style="font-size:.8rem">Cases {range[0]} à {Math.min(range[1], s.frets)}</div></div>
        <div class="seg" role="group" aria-label="Affichage des notes" style="flex:0 0 auto">
          {([['degrees', 'Degrés'], ['names', 'Notes'], ['none', 'Mémoire']] as const).map(([k, l]) => <button aria-pressed={label === k} style="min-height:36px" onClick={() => setLabel(k)}>{l}</button>)}</div>
        <button class="icon-btn" aria-label="Réglages du manche" aria-pressed={panel} onClick={() => setPanel(p => !p)}><Icon name="settings" /></button>
      </div>
      <div style="flex:1;display:flex;align-items:center;min-height:0">{neck}</div>
      <div style="height:44px;flex-shrink:0;display:flex;align-items:center;padding:0 16px"><Legend compact /></div>
      {panel && <div style="position:absolute;right:0;top:56px;bottom:0;width:min(340px,70vw);background:var(--panel);border-left:1px solid var(--border);overflow:auto;padding:8px 12px">{controls}</div>}
    </div>);
  return (<>
    {neck}
    <Legend />
    {controls}
    <p class="muted">Astuce : en paysage, le manche passe en plein écran.</p>
  </>);
}

export function Legend({ compact }: { compact?: boolean }) {
  return <div style={`display:flex;flex-wrap:wrap;gap:6px 16px;margin:${compact ? 0 : 12}px 0`} aria-label="Légende">
    {['root', 'third', 'fifth', 'seventh', 'extension'].map(r => <span style="display:inline-flex;align-items:center;gap:6px;font-size:.88rem;color:var(--muted)"><RoleGlyph role={r} size={20} />{ROLE_NAME[r]}</span>)}
  </div>;
}

export function MancheModule({ s }: { s: Settings }) {
  const [tab, setTab] = useState<'ex' | 'explorer' | 'carte'>('ex');
  const focus = useFocusState(); // pendant un exercice : plein écran, sans titre ni onglets
  return (<>
    {!focus && <h1>Manche</h1>}
    {!focus && <div class="seg" role="tablist" style="margin-bottom:12px">
      {([['ex', 'Exercices'], ['explorer', 'Explorer'], ['carte', 'Carte']] as const).map(([k, l]) =>
        <button role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
    </div>}
    {tab === 'ex' ? <Exercices s={s} /> : tab === 'explorer' ? <Explorer s={s} onBack={() => setTab('ex')} /> : <Carte s={s} />}
  </>);
}
