import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { engine } from '../audio/engine';
import { Backing } from '../audio/backing/Backing';
import { playBassNote } from '../audio/backing/voices';
import { analyzeGroove, type GrooveResult } from '../exercises/groove';
import { fromRaw, PHRASES, quantizeCapture, STYLE_LABELS, STYLE_ORDER, toBars, toPattern, transpose, phraseGrid, validate, type Phrase, type RawPhrase, type CapturedNote } from '../exercises/vocab';
import { formatSymbol } from '../theory/chords';
import { midiName } from '../audio/notes';
import { KEYS } from './Jam';
import { db } from '../storage/db';
import { recordSrs } from '../storage/srs';
import { today } from '../storage/stats';
import { useNotes } from './useNotes';
import { keepAwake } from './wakeLock';
import { Metronome } from '../audio/metronome';
import { applyPresetFor } from '../nux/presets';
import { useOnDisconnect } from './useEngine';
import { useRemote } from './useRemote';

const BACK: Record<string, string> = { blues: 'blues-shuffle', funk: 'funk', rock: 'rock', pop: 'pop', reggae: 'reggae', soul: 'soul', jazz: 'jazz', latin: 'bossa', perso: 'pop' };
const GLYPH = (d: number) => (d >= 3.5 ? '𝅝' : d >= 1.75 ? '𝅗𝅥' : d >= 0.9 ? '♩' : d >= 0.45 ? '♪' : '𝅘𝅥𝅯');
const STR_NAMES = ['G', 'D', 'A', 'E'];

async function loadUser(): Promise<Phrase[]> { const r = await db.kv.get('userPhrases'); return ((r?.value as RawPhrase[]) ?? []).map(x => fromRaw(x, 'perso', true)); }
async function saveUser(list: Phrase[]) { await db.kv.put({ key: 'userPhrases', value: list.map(p => ({ id: p.id, name: p.name, bpm: p.bpm, key: p.key, grid: p.grid, swing: p.swing, tip: p.tip, style: 'perso', bars: toBars(p.notes, p.bars) })) }); }

export function Vocabulaire({ s }: { s: Settings }) {
  const [style, setStyle] = useState('blues'); const [sel, setSel] = useState<Phrase | null>(null); const [mine, setMine] = useState<Phrase[]>([]); const [adding, setAdding] = useState(false);
  const reload = () => loadUser().then(setMine);
  useEffect(() => { reload(); }, []);
  if (adding) return <Editor s={s} onDone={() => { setAdding(false); reload(); }} />;
  if (sel) return <PhraseDetail s={s} base={sel} onExit={() => { setSel(null); reload(); }} onDelete={sel.user ? async () => { await saveUser(mine.filter(x => x.id !== sel.id)); setSel(null); reload(); } : undefined} />;
  const list = style === 'perso' ? mine : PHRASES.filter(p => p.style === style);
  return (<>
    <h1>Vocabulaire</h1>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px" role="tablist">
      {[...STYLE_ORDER, 'perso'].map(k => <button role="tab" aria-selected={style === k} class="btn" style={`width:auto;min-height:44px;padding:0 14px;${style === k ? 'background:var(--accent);color:var(--on-accent)' : ''}`} onClick={() => setStyle(k)}>{STYLE_LABELS[k]}</button>)}
    </div>
    {list.map(p => <button class="card" style="width:100%;text-align:left;color:inherit;cursor:pointer" onClick={() => setSel(p)}><b>{p.name}</b><span class="muted" style="float:right">{p.bpm} BPM · {p.bars} mes.</span><div class="muted">{p.tip}</div></button>)}
    {style === 'perso' && <><button class="btn primary" style="min-height:64px" onClick={() => setAdding(true)}>+ Ajouter ma phrase</button>{!mine.length && <p class="muted">Aucune phrase pour l'instant : saisissez-la en tablature ou jouez-la, l'appli la retrouve.</p>}</>}
    <p class="muted">{PHRASES.length} phrases originales composées pour l'appli, transposables dans les 12 tonalités.</p>
  </>);
}

function Tab({ p, pos, score }: { p: Phrase; pos: number; score: boolean }) {
  const W = 40 + p.bars * 220, H = 150, X = (b: number) => 30 + b * 52, Y = (st: number) => 25 + (3 - st) * 30;
  return <div style="overflow-x:auto"><svg viewBox={`0 0 ${W} ${H}`} style={`min-width:${Math.min(W, 640)}px;width:100%;background:var(--panel);border-radius:12px`} role="img" aria-label="Tablature">
    {[0, 1, 2, 3].map(st => <><line x1="24" x2={W - 8} y1={Y(st)} y2={Y(st)} stroke="var(--muted)" /><text x="6" y={Y(st) + 5} fill="var(--muted)" font-size="14">{STR_NAMES[3 - st]}</text></>)}
    {Array.from({ length: p.bars + 1 }, (_, i) => <line x1={X(i * 4)} x2={X(i * 4)} y1={Y(3) - 10} y2={Y(0) + 10} stroke="var(--muted)" stroke-width={i === 0 || i === p.bars ? 3 : 1} />)}
    {p.notes.map(n => { const x = X(n.beat) + 4, y = Y(n.string), played = pos >= n.beat && pos < n.beat + Math.max(0.5, n.dur);
      return <g><rect x={x - 12} y={y - 12} width="24" height="22" rx="5" fill={played ? 'var(--accent)' : 'var(--bg)'} stroke="var(--border)" /><text x={x} y={y + 5} text-anchor="middle" font-weight="700" font-size="15" fill={played ? 'var(--on-accent)' : 'var(--text)'}>{n.fret}</text>
        {score && <text x={x} y={H - 6} text-anchor="middle" font-size="12" fill="var(--muted)">{GLYPH(n.dur)}</text>}</g>; })}
    {pos >= 0 && <line x1={X(pos)} x2={X(pos)} y1="8" y2={H - 20} stroke="var(--danger)" stroke-width="2" />}
  </svg></div>;
}

export function PhraseDetail({ s, base, onExit, onDelete }: { s: Settings; base: Phrase; onExit: () => void; onDelete?: () => void }) {
  const [key, setKey] = useState(base.key); const [bpm, setBpm] = useState(base.bpm); const [loop, setLoop] = useState(true); const [score, setScore] = useState(false);
  const [mode, setMode] = useState<'off' | 'listen' | 'play'>('off'); const [pos, setPos] = useState(-1); const [res, setRes] = useState<GrooveResult | null>(null);
  const p = key === base.key ? base : transpose(base, key);
  const bk = useRef<Backing | null>(null); const info = useRef<{ time: number; bpm: number; bar: number } | null>(null); const notes = useRef<{ t: number; midi: number | null }[]>([]); const raf = useRef(0);
  useNotes(mode === 'play', s.refA, e => notes.current.push({ t: e.t, midi: e.midi }), s.inputDeviceId);
  useEffect(() => () => { bk.current?.dispose(); cancelAnimationFrame(raf.current); keepAwake(false); }, []);

  const stop = () => { bk.current?.dispose(); bk.current = null; cancelAnimationFrame(raf.current); setMode('off'); setPos(-1); keepAwake(false); };
  const run = async (m: 'listen' | 'play') => {
    stop(); const g = phraseGrid(p); if (!g) return; const ctx = await engine.getContext(); notes.current = []; setRes(null);
    const b = new Backing(ctx, g, { style: BACK[base.style] ?? 'pop', bpm, swing: base.swing, laps: m === 'play' ? 3 : (loop ? 0 : 2), countIn: 1, mute: { drums: false, keys: false, gtr: false } });
    b.onSchedule = i => {
      if (i.countIn || m === 'play') return; const bd = 60 / i.bpm;
      p.notes.filter(n => n.beat >= i.bar * 4 && n.beat < (i.bar + 1) * 4).forEach(n => { const off = n.beat - i.bar * 4, sw = Math.abs(off % 1 - 0.5) < 1e-6 ? base.swing * bd / 6 : 0; playBassNote(ctx, b.bus, i.time + off * bd + sw, n.midi, Math.max(0.12, n.dur * bd * 0.9)); });
    };
    b.onBar = i => { info.current = i.countIn ? null : { time: i.time, bpm: i.bpm, bar: i.bar }; };
    b.onEnd = () => { if (m === 'play') finish(b); stop(); };
    bk.current = b; b.start(); setMode(m); keepAwake(true); applyPresetFor(base.style === 'perso' ? 'clean' : base.style, s);
    const tick = () => { const i = info.current; if (i && bk.current) setPos(i.bar * 4 + (ctx.currentTime - i.time) / (60 / i.bpm)); else setPos(-1); raf.current = requestAnimationFrame(tick); }; tick();
  };
  const finish = async (b: Backing) => {
    const bars = b.barTimes.filter(x => !x.countIn).map(x => ({ time: x.time, bpm: x.bpm, audible: true }));
    const lat = (s.inputMode === 'usb' ? s.latencyUsbMs : s.latencyBluetoothMs) / 1000;
    const r = analyzeGroove(toPattern(p), bars, notes.current.map(n => ({ t: n.t, midi: n.midi })), { latencyS: lat });
    setRes(r); await recordSrs(`phrase:${base.id}`, r.success >= 0.8);
    await db.sessions.add({ date: today(), module: `vocab:${base.id}`, seconds: 60, score: Math.round(r.success * 100) });
  };
  useOnDisconnect(() => { if (mode === 'play') stop(); });
  useRemote(() => { if (mode === 'off') run('listen'); else stop(); }, s);
  return (<>
    <button class="btn" style="min-height:44px" onClick={() => { stop(); onExit(); }}>← Retour</button>
    <h1>{base.name}</h1><p class="muted">{base.tip}</p>
    <Tab p={p} pos={pos} score={score} />
    <div class="muted" style="margin:6px 0">Grille : {phraseGrid(p)?.bars.map(b => formatSymbol(b[0].chord.symbol, s.notation)).join(' | ')}</div>
    <div class="card">
      <label>Tonalité <select value={key} onChange={e => { stop(); setKey((e.target as HTMLSelectElement).value); }}>{KEYS.map(k => <option value={k}>{s.notation === 'fr' ? formatSymbol(k, 'fr') : k}</option>)}</select></label>
      <label>Tempo <span>{bpm} BPM</span></label><input type="range" style="width:100%" min="50" max="160" value={bpm} onInput={e => setBpm(Number((e.target as HTMLInputElement).value))} aria-label="Tempo" />
      <label>Boucle <input type="checkbox" checked={loop} onChange={e => setLoop((e.target as HTMLInputElement).checked)} /></label>
      <label>Partition simplifiée (durées) <input type="checkbox" checked={score} onChange={e => setScore((e.target as HTMLInputElement).checked)} /></label>
      {score && <p class="muted">{p.notes.map(n => `${midiName(n.midi, s.notation).name}${GLYPH(n.dur)}`).join(' ')}</p>}
    </div>
    {mode === 'off' ? <><button class="btn primary" onClick={() => run('listen')}>▶ Écouter</button><button class="btn" style="margin-top:8px" onClick={() => run('play')}>🎸 À moi de jouer (3 tours)</button></>
      : <button class="btn primary" onClick={stop}>Arrêter</button>}
    {res && <div class="card" role="status"><h2>{Math.round(res.success * 100)} % · {res.verdict.bias === 'centré' ? 'centré' : res.verdict.bias === 'retard' ? `en retard (${Math.round(res.meanMs)} ms)` : `en avance (${Math.round(-res.meanMs)} ms)`}</h2>{res.advice.map(a => <p>• {a}</p>)}
      <p class="muted">{res.success >= 0.8 ? 'Phrase validée : elle reviendra moins souvent.' : 'Elle reviendra plus souvent dans vos séances.'}</p></div>}
    {onDelete && <button class="btn" style="margin-top:16px;border-color:var(--danger)" onClick={onDelete}>Supprimer cette phrase</button>}
  </>);
}

function Editor({ s, onDone }: { s: Settings; onDone: () => void }) {
  const [name, setName] = useState(''); const [text, setText] = useState('0:E0:1 1:E3:1 2:A2:1 3:A0:1'); const [err, setErr] = useState('');
  const [cap, setCap] = useState<'idle' | 'rec'>('idle'); const [bpm, setBpm] = useState(80); const ons = useRef<CapturedNote[]>([]); const m = useRef<Metronome | null>(null);
  useNotes(cap === 'rec', s.refA, e => ons.current.push({ t: e.t, midi: e.midi }), s.inputDeviceId);
  const save = async (bars: string[]) => {
    try {
      const raw: RawPhrase = { id: `user-${Date.now()}`, name: name.trim() || 'Ma phrase', bpm, key: 'E', grid: bars.map(() => 'I').join(' | '), swing: 0, tip: 'Ma phrase', bars };
      const p = fromRaw(raw, 'perso', true); const v = validate(p).filter(e => !/hors 0-12|grille/.test(e)); if (v.length) throw new Error(v[0]); if (!p.notes.length) throw new Error('Aucune note');
      const list = await loadUser(); await saveUser([...list, p]); onDone();
    } catch (e) { setErr((e as Error).message); }
  };
  const capture = async () => {
    const ctx = await engine.getContext(); ons.current = []; setCap('rec'); setErr('');
    let n = 0, t0 = 0; const mt = new Metronome(ctx, { bpm, beatsPerBar: 4, subdivision: 1, accent: true }, (b, t) => { if (b === 0) { n++; if (n === 2) t0 = t; if (n === 4) { mt.stop(); setCap('idle'); setTimeout(() => { const q = quantizeCapture(ons.current, t0, bpm, 2); if (q.length < 2) setErr('Pas assez de notes détectées : réessayez plus fort.'); else save(toBars(q, 2)); }, 400); } } });
    m.current = mt; mt.start();
  };
  return (<><button class="btn" style="min-height:44px" onClick={onDone}>← Retour</button><h1>Ma phrase</h1>
    <div class="card"><label>Nom <input value={name} onInput={e => setName((e.target as HTMLInputElement).value)} placeholder="Ma phrase" /></label>
      <label>Tempo <input type="number" min="50" max="160" value={bpm} onChange={e => setBpm(Number((e.target as HTMLInputElement).value))} /></label></div>
    <div class="card"><h2>Saisir en tablature</h2><p class="muted">Une mesure par ligne. Chaque note : <code>temps:corde+case:durée</code> (cordes E A D G). Ex. <code>0:E0:1 1:A2:.5</code></p>
      <textarea style="width:100%;min-height:90px;font-size:1rem" value={text} onInput={e => setText((e.target as HTMLTextAreaElement).value)} />
      <button class="btn" onClick={() => save(text.split('\n').filter(l => l.trim()))}>Enregistrer la saisie</button></div>
    <div class="card"><h2>Ou jouez-la</h2><p class="muted">Décompte d'une mesure, puis 2 mesures enregistrées, quantifiées à la double croche.</p>
      <button class="btn" disabled={cap === 'rec'} onClick={capture}>{cap === 'rec' ? '● Enregistrement…' : 'Capturer ma phrase (2 mesures)'}</button></div>
    {err && <p role="alert">{err}</p>}</>);
}
