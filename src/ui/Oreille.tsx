import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { engine } from '../audio/engine';
import { makeBuses, playBassNote, renderEvent } from '../audio/backing/voices';
import { chordChoices, degreeChord, DEGREE_LEVELS, intervalChoices, intervalNotes, makeChord, makeDegrees, makeInterval, makeLine, type Choice } from '../exercises/ear';
import { applyNote, newState, type Round } from '../exercises/manche';
import { loadSrs, recordSrs } from '../storage/srs';
import { db, type SrsItem } from '../storage/db';
import { today } from '../storage/stats';
import { midiName } from '../audio/notes';
import { useNotes } from './useNotes';

type Kind = 'interval' | 'chord' | 'degree' | 'line';
const KINDS: [Kind, string][] = [['interval', 'Intervalles'], ['chord', 'Accords'], ['degree', 'Degrés'], ['line', 'Relevé de ligne']];
const N = 10;

export function Oreille({ s }: { s: Settings }) {
  const [kind, setKind] = useState<Kind | null>(null);
  if (kind) return <Quiz s={s} kind={kind} onExit={() => setKind(null)} />;
  return (<><h1>Oreille</h1><p class="muted">Écoutez, identifiez. Les types ratés reviennent plus souvent.</p>
    {KINDS.map(([k, l]) => <button class="card" style="width:100%;text-align:left;color:inherit;font-size:1.2rem;cursor:pointer" onClick={() => setKind(k)}><b>{l}</b></button>)}</>);
}

function Quiz({ s, kind, onExit }: { s: Settings; kind: Kind; onExit: () => void }) {
  const [level, setLevel] = useState(0); const [i, setI] = useState(-1); const [q, setQ] = useState<any>(null); const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [ok, setOk] = useState(0); const [done, setDone] = useState(false); const [replays, setReplays] = useState(0);
  const srs = useRef<Map<string, SrsItem>>(new Map()); const out = useRef<ReturnType<typeof makeBuses> | null>(null);
  const [lineActive, setLineActive] = useState(false); const round = useRef<Round | null>(null); const st = useRef(newState()); const [prog, setProg] = useState(0);
  useEffect(() => { loadSrs().then(m => { srs.current = m; }); return () => { out.current?.out.disconnect(); }; }, []);
  const ctxOut = async () => { const ctx = await engine.getContext(); out.current ??= makeBuses(ctx); return { ctx, o: out.current }; };

  const play = async (qq: any) => {
    const { ctx, o } = await ctxOut(); const t = ctx.currentTime + 0.1;
    if (kind === 'interval') { const n = intervalNotes(qq); if (qq.dir === 'harm') n.forEach(m => playBassNote(ctx, o.out, t, m, 1.4)); else n.forEach((m, k) => playBassNote(ctx, o.out, t + k * 0.8, m, 0.9)); }
    if (kind === 'chord') { renderEvent(ctx, o.buses, { t, voice: 'keys', midi: qq.notes, dur: 1.2, vel: 0.8 }); qq.notes.forEach((m: number, k: number) => renderEvent(ctx, o.buses, { t: t + 1.6 + k * 0.3, voice: 'keys', midi: [m], dur: 0.5, vel: 0.7 })); }
    if (kind === 'degree') { const seq = ['I', 'IV', 'V', 'I', '', ...qq.chords]; seq.forEach((c: string, k: number) => { if (c) renderEvent(ctx, o.buses, { t: t + k * 0.9, voice: 'keys', midi: degreeChord(c, qq.key), dur: 0.8, vel: 0.7 }); }); }
    if (kind === 'line') qq.notes.forEach((m: number, k: number) => playBassNote(ctx, o.out, t + k * 0.6, m, 0.5));
  };
  const next = async () => {
    const n = i + 1; if (n >= N) { setDone(true); await db.sessions.add({ date: today(), module: `ear:${kind}`, seconds: N * 15, score: Math.round(ok / N * 100) }); return; }
    const qq: any = kind === 'interval' ? makeInterval(level, srs.current) : kind === 'chord' ? makeChord(level, srs.current) : kind === 'degree' ? makeDegrees(level, srs.current) : makeLine(level, srs.current);
    setQ(qq); setI(n); setFb(null); setReplays(0); setProg(0);
    if (kind === 'line') { round.current = { kind: 'scale', prompt: '', targets: qq.notes, ordered: true, show: [] }; st.current = newState(); setLineActive(true); }
    setTimeout(() => play(qq), 100);
  };
  const answer = async (id: string, label: string) => {
    if (fb || !q) return; const good = id === q.answer; setOk(o => o + (good ? 1 : 0)); await recordSrs(q.srsId, good); srs.current = await loadSrs();
    setFb({ ok: good, text: good ? 'Juste !' : `Non : c'était « ${label} »` });
  };
  useNotes(kind === 'line' && lineActive && !fb, s.refA, e => {
    if (e.midi === null || !round.current) return; const r = applyNote(round.current, st.current, e.midi); setProg(st.current.idx);
    if (r === 'wrong') { /* on laisse réessayer */ } if (st.current.done) { setLineActive(false); setOk(o => o + 1); recordSrs(q.srsId, true); setFb({ ok: true, text: 'Bien relevé !' }); }
  }, s.inputDeviceId);

  const choices: Choice[] = kind === 'interval' ? intervalChoices(level) : kind === 'chord' ? chordChoices(level) : kind === 'degree' ? DEGREE_LEVELS[Math.min(level, 2)].map(d => ({ id: d, label: d })) : [];
  if (done) return <div class="card" role="status"><h1>{ok} / {N}</h1><p>{ok >= 9 ? 'Excellent !' : ok >= 7 ? 'Bien joué.' : 'À retravailler : ces types reviendront.'}</p><button class="btn primary" onClick={() => { setI(-1); setOk(0); setDone(false); setQ(null); }}>Rejouer</button><button class="btn" style="margin-top:8px" onClick={onExit}>Retour</button></div>;
  return (<>
    <button class="btn" style="min-height:44px" onClick={onExit}>← Retour</button><h1>{KINDS.find(k => k[0] === kind)![1]}</h1>
    {i < 0 ? <div class="card"><label>Niveau <select value={level} onChange={e => setLevel(Number((e.target as HTMLSelectElement).value))}><option value="0">1 — facile</option><option value="1">2 — moyen</option><option value="2">3 — difficile</option></select></label>
      {kind === 'line' && <p class="muted">L'appli joue une courte ligne de basse : retrouvez-la sur votre instrument, note après note.</p>}
      <button class="btn primary" onClick={next}>Commencer ({N} questions)</button></div> : <>
      <div class="card" style="text-align:center"><div class="muted">Question {i + 1} / {N}</div>
        {kind === 'degree' && q && <p style="font-size:1.2rem">Après la cadence I-IV-V-I, quel est le degré du <b>{q.ask + 1}ᵉ</b> accord de la suite ?</p>}
        {kind === 'line' && q && <p style="font-size:1.2rem">Rejouez les {q.length} notes · {prog} / {q.length}{replays >= 1 && ` · 1ʳᵉ note : ${midiName(q.notes[0], s.notation).name}`}</p>}
        <button class="btn" onClick={() => { setReplays(r => r + 1); play(q); }}>🔊 Réécouter</button></div>
      {kind !== 'line' && <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">{choices.map(c => <button class="btn" disabled={!!fb} onClick={() => answer(c.id, c.label)}>{c.label}</button>)}</div>}
      {kind === 'line' && !fb && <button class="btn" style="margin-top:8px" onClick={() => { setLineActive(false); setFb({ ok: false, text: `Ligne : ${q.notes.map((m: number) => midiName(m, s.notation).name).join(' – ')}` }); recordSrs(q.srsId, false); }}>Je passe</button>}
      {fb && <div class="card" role="status" style={`border-color:${fb.ok ? 'var(--accent)' : 'var(--danger)'}`}><b>{fb.text}</b>{kind === 'degree' && !fb.ok && <p class="muted">{q.chords.join(' – ')}</p>}<button class="btn primary" style="margin-top:8px" onClick={next}>Suivant</button></div>}
      </>}
  </>);
}
