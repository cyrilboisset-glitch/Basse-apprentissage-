import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { engine } from '../audio/engine';
import { Metronome } from '../audio/metronome';
import { analyzeGroove, getPattern } from '../exercises/groove';
import { makeRound } from '../exercises/manche';
import { makeInterval, intervalNotes, intervalChoices } from '../exercises/ear';
import { LESSONS } from '../exercises/theory';
import { makeBuses, playBassNote } from '../audio/backing/voices';
import { midiName } from '../audio/notes';
import { Fretboard } from './Fretboard';
import { getTuning } from '../audio/notes';
import { useNotes } from './useNotes';
import { db } from '../storage/db';
import { saveDrill, today } from '../storage/stats';


type Phase = 'intro' | 'quiz' | 'rhythm' | 'theory' | 'ear' | 'result';
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export function Placement({ s }: { s: Settings }) {
  const [phase, setPhase] = useState<Phase>('intro'); const [sc, setSc] = useState({ a: 0, b: 0, rhythm: -1, theory: 0, ear: 0 });
  const tuning = getTuning(s.tuning).midi;
  // 1. quiz visuel : 4 questions cases 0-5, 4 questions cases 5-12
  const [qs] = useState(() => Array.from({ length: 8 }, (_, i) => makeRound('quiz', { tuning, frets: 12, zone: i < 4 ? { from: 0, to: 5 } : { from: 5, to: 12 }, notation: s.notation, srs: new Map(), rng: Math.random })));
  const [qi, setQi] = useState(0); const [ans, setAns] = useState<boolean[]>([]);
  const [tq] = useState(() => shuffle(LESSONS.flatMap(l => l.build(Math.random, s.notation).quiz)).slice(0, 4)); const [ti, setTi] = useState(0); const [tOk, setTOk] = useState(0);
  const [iq] = useState(() => Array.from({ length: 4 }, () => makeInterval(1, new Map()))); const [ei, setEi] = useState(0); const [eOk, setEOk] = useState(0); const [eAns, setEAns] = useState<boolean | null>(null);
  const out = useRef<ReturnType<typeof makeBuses> | null>(null);
  // 2. rythme
  const [rBusy, setRBusy] = useState(false); const [rMsg, setRMsg] = useState(''); const ons = useRef<{ t: number; midi: number | null }[]>([]);
  useNotes(rBusy, s.refA, e => ons.current.push({ t: e.t, midi: e.midi }), s.inputDeviceId);
  useEffect(() => () => { out.current?.out.disconnect(); }, []);

  const answerQuiz = (p: number) => { const ok = p === qs[qi].quizPc; const a = [...ans, ok]; setAns(a); if (qi + 1 < qs.length) setQi(qi + 1); else { setSc(x => ({ ...x, a: a.slice(0, 4).filter(Boolean).length / 4, b: a.slice(4).filter(Boolean).length / 4 })); setPhase('rhythm'); } };
  const runRhythm = async () => {
    const ctx = await engine.getContext(); ons.current = []; setRBusy(true); setRMsg('Jouez des noires sur le clic (4 mesures)…');
    const bars: { time: number; bpm: number; audible: boolean }[] = []; let n = -1, finished = false;
    const m = new Metronome(ctx, { bpm: 80, beatsPerBar: 4, subdivision: 1, accent: true }, (b, t) => { if (b === 0) { n++; if (n >= 1) bars.push({ time: t, bpm: 80, audible: true }); if (n >= 5 && !finished) { finished = true; m.stop(); bars.pop(); setTimeout(() => {
      const lat = (s.inputMode === 'usb' ? s.latencyUsbMs : s.latencyBluetoothMs) / 1000; const r = analyzeGroove(getPattern('q'), bars, ons.current, { latencyS: lat }); setRBusy(false);
      const good = r.devs.length >= 8 && r.success >= 0.8 && r.sdMs < 30; setSc(x => ({ ...x, rhythm: r.devs.length < 4 ? -1 : good ? 1 : 0 })); setRMsg(r.devs.length < 4 ? 'Aucune note détectée : étape ignorée.' : `${Math.round(r.success * 100)} % · ±${Math.round(r.sdMs)} ms`); setTimeout(() => setPhase('theory'), 1200); }, 500); } } });
    m.start();
  };
  const answerTheory = (i: number) => { const ok = i === tq[ti].answer; const t = tOk + (ok ? 1 : 0); setTOk(t); if (ti + 1 < tq.length) setTi(ti + 1); else { setSc(x => ({ ...x, theory: t / tq.length })); setPhase('ear'); } };
  const playEar = async () => { const ctx = await engine.getContext(); out.current ??= makeBuses(ctx); const t = ctx.currentTime + 0.1; intervalNotes(iq[ei]).forEach((m, k) => playBassNote(ctx, out.current!.out, t + k * 0.8, m, 0.9)); };
  const answerEar = async (id: string) => { if (eAns !== null) return; const ok = id === iq[ei].answer; setEAns(ok); const t = eOk + (ok ? 1 : 0); setEOk(t); setTimeout(() => { setEAns(null); if (ei + 1 < iq.length) setEi(ei + 1); else { setSc(x => ({ ...x, ear: t / iq.length })); finish(t / iq.length); } }, 900); };
  const level = 1 + (sc.a >= 0.75 ? 1 : 0) + (sc.b >= 0.75 ? 1 : 0) + (sc.rhythm === 1 ? 1 : 0) + (sc.theory >= 0.75 ? 1 : 0) + (sc.ear >= 0.75 ? 1 : 0);
  const finish = async (earScore: number) => {
    const lv = 1 + (sc.a >= 0.75 ? 1 : 0) + (sc.b >= 0.75 ? 1 : 0) + (sc.rhythm === 1 ? 1 : 0) + (sc.theory >= 0.75 ? 1 : 0) + (earScore >= 0.75 ? 1 : 0);
    await db.kv.put({ key: 'placement', value: { level: lv, date: today() } });
    const unlock = sc.b >= 0.75 ? ['z0', 'z1', 'z2'] : sc.a >= 0.75 ? ['z0'] : [];
    for (const z of unlock) for (let i = 0; i < 3; i++) await saveDrill({ date: today(), kind: 'placement', zone: z, accuracy: 0.95, correct: 1, wrong: 0, seconds: 0 });
    setPhase('result');
  };
  const q = qs[qi];
  return (<>
    <a href="#/" class="muted">← Accueil</a><h1>Test de positionnement</h1>
    {phase === 'intro' && <><div class="card"><p>Environ 10 minutes : repérage sur le manche, rythme, théorie, oreille. Cela débloque les zones du manche que vous maîtrisez déjà et choisit votre niveau de départ. Vous pourrez le refaire à tout moment.</p>
      <p class="muted">Aucune pression : répondez au mieux.</p></div><button class="btn primary" onClick={() => setPhase('quiz')}>Commencer</button></>}
    {phase === 'quiz' && <><div class="muted">Repérage {qi + 1} / {qs.length}</div><Fretboard tuning={tuning} from={0} to={12} leftHanded={s.leftHanded} marks={new Map([[`${q.show[0].string}:${q.show[0].fret}`, { role: 'root' as const, label: '?' }]])} />
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">{Array.from({ length: 12 }, (_, p) => <button class="btn" onClick={() => answerQuiz(p)}>{midiName(p + 12, s.notation).name}</button>)}</div></>}
    {phase === 'rhythm' && <div class="card"><h2>Rythme</h2><p>Jouez des noires (une note par clic) sur un clic à 80 BPM pendant 4 mesures, n'importe quelle note.</p><p role="status">{rMsg}</p>
      <button class="btn primary" disabled={rBusy} onClick={runRhythm}>Lancer</button><button class="btn" style="margin-top:8px" disabled={rBusy} onClick={() => setPhase('theory')}>Passer (pas de basse sous la main)</button></div>}
    {phase === 'theory' && <div class="card"><div class="muted">Théorie {ti + 1} / {tq.length}</div><p style="font-size:1.2rem">{tq[ti].q}</p>{tq[ti].choices.map((c, i) => <button class="btn" style="margin:6px 0" onClick={() => answerTheory(i)}>{c}</button>)}</div>}
    {phase === 'ear' && <div class="card"><div class="muted">Oreille {ei + 1} / {iq.length}</div><button class="btn" onClick={playEar}>🔊 Écouter</button>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px">{intervalChoices(1).map(c => <button class="btn" disabled={eAns !== null} onClick={() => answerEar(c.id)}>{c.label}</button>)}</div>{eAns !== null && <p role="status">{eAns ? 'Juste !' : 'Raté'}</p>}</div>}
    {phase === 'result' && <div class="card" role="status"><h2>Niveau conseillé : {level}</h2>
      <p>Repérage cases 0-5 : {Math.round(sc.a * 100)} % · cases 5-12 : {Math.round(sc.b * 100)} % · rythme : {sc.rhythm === -1 ? 'non évalué' : sc.rhythm ? 'solide' : 'à travailler'} · théorie : {Math.round(sc.theory * 100)} % · oreille : {Math.round(sc.ear * 100)} %</p>
      <p class="muted">{sc.b >= 0.75 ? 'Les cases 0-12 sont débloquées.' : sc.a >= 0.75 ? 'Les cases 0-5 sont validées : la zone suivante est débloquée.' : 'On repart de la zone 0-5.'}</p>
      <a class="btn primary" href="#/" style="display:grid;place-items:center;text-decoration:none">Voir ma séance du jour</a></div>}
  </>);
}
