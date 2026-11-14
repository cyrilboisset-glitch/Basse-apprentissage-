import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { LESSONS, getLesson, type Lesson } from '../exercises/theory';
import { applyNote, newState, type Round, type RoundState } from '../exercises/manche';
import { useNotes } from './useNotes';
import { STATUS_MSG, useEngineStatus } from './useEngine';
import { db } from '../storage/db';
import { today } from '../storage/stats';
import { midiName } from '../audio/notes';
import { keepAwake } from './wakeLock';

export function Theorie({ s }: { s: Settings }) {
  const [id, setId] = useState<string | null>(null);
  if (id) return <LessonRunner s={s} lessonId={id} onExit={() => setId(null)} />;
  return (<><h1>Théorie appliquée</h1><p class="muted">Deux minutes de lecture, puis un exercice joué tout de suite.</p>
    {LESSONS.map(l => <button class="card" style="width:100%;text-align:left;color:inherit;cursor:pointer" onClick={() => setId(l.id)}><b>{l.title}</b></button>)}</>);
}

export function LessonRunner({ s, lessonId, onExit }: { s: Settings; lessonId: string; onExit: () => void }) {
  useEffect(() => { keepAwake(true); return () => { keepAwake(false); }; }, []);
  const lesson: Lesson = getLesson(lessonId); const status = useEngineStatus();
  const [built] = useState(() => lesson.build(Math.random, s.notation));
  const [phase, setPhase] = useState<'read' | 'quiz' | 'play' | 'done'>('read'); const [qi, setQi] = useState(0); const [picked, setPicked] = useState<number | null>(null);
  const [ri, setRi] = useState(0); const [, tick] = useState(0); const [flash, setFlash] = useState<'ok' | 'wrong' | null>(null);
  const tot = useRef({ c: 0, w: 0 }); const st = useRef<RoundState>(newState()); const round: Round | undefined = built.rounds[ri];
  const next = () => { if (ri + 1 >= built.rounds.length) setPhase('done'); else { setRi(ri + 1); st.current = newState(); setFlash(null); } };
  useNotes(phase === 'play', s.refA, e => {
    if (e.midi === null || !round) return; const r = applyNote(round, st.current, e.midi); if (r === 'ignored') return;
    tot.current[r === 'ok' ? 'c' : 'w']++; setFlash(r); tick(x => x + 1); if (st.current.done) setTimeout(next, 600);
  }, s.inputDeviceId);
  useEffect(() => { if (phase === 'done') { const { c, w } = tot.current; db.sessions.add({ date: today(), module: `theory:${lesson.id}`, seconds: 180, score: Math.round(100 * (c + quizOk.current) / Math.max(1, c + w + quizOk.current + quizKo.current)) }); } }, [phase]);
  const quizOk = useRef(0), quizKo = useRef(0);
  const answer = (i: number) => { if (picked !== null) return; setPicked(i); if (i === built.quiz[qi].answer) quizOk.current++; else quizKo.current++; };
  const afterQuiz = () => { setPicked(null); if (qi + 1 < built.quiz.length) setQi(qi + 1); else if (built.rounds.length) setPhase('play'); else setPhase('done'); };

  return (<>
    <button class="btn" style="min-height:44px" onClick={onExit}>← Retour</button><h1>{lesson.title}</h1>
    {phase === 'read' && <><div class="card">{lesson.text.map(t => <p>{t}</p>)}</div><button class="btn primary" onClick={() => setPhase(built.quiz.length ? 'quiz' : 'play')}>J'ai lu : à l'exercice</button></>}
    {phase === 'quiz' && <div class="card"><div class="muted">Question {qi + 1} / {built.quiz.length}</div><p style="font-size:1.2rem">{built.quiz[qi].q}</p>
      {built.quiz[qi].choices.map((c, i) => <button class="btn" style={`margin:6px 0;${picked !== null ? (i === built.quiz[qi].answer ? 'background:#14532d' : i === picked ? 'background:#7f1d1d' : '') : ''}`} disabled={picked !== null} onClick={() => answer(i)}>{c}</button>)}
      {picked !== null && <button class="btn primary" onClick={afterQuiz}>Suivant</button>}</div>}
    {phase === 'play' && round && <>{STATUS_MSG[status] && <div class="card" role="alert">{STATUS_MSG[status]}</div>}
      <div class="muted">Exercice {ri + 1} / {built.rounds.length}</div>
      <h2 style={`border-radius:12px;padding:8px;${flash === 'ok' ? 'background:#14532d' : flash === 'wrong' ? 'background:#7f1d1d' : ''}`}>{round.prompt}</h2>
      <p style="font-size:1.4rem;text-align:center">{round.targets.map((m, i) => <span style={i < st.current.idx ? 'color:var(--accent)' : i === st.current.idx ? 'font-weight:800;text-decoration:underline' : 'opacity:.6'}>{midiName(m, s.notation).name} </span>)}</p>
      <button class="btn" onClick={() => { tot.current.w += round.targets.length - st.current.idx; next(); }}>Passer</button></>}
    {phase === 'done' && <div class="card" role="status"><h2>Leçon terminée</h2><p>{quizOk.current} bonne(s) réponse(s) · {tot.current.c} note(s) juste(s) · {tot.current.w} erreur(s)</p>
      {lesson.link && <a class="btn" style="display:block;text-align:center;line-height:56px;text-decoration:none" href={lesson.link.href}>{lesson.link.label}</a>}
      <button class="btn primary" style="margin-top:8px" onClick={onExit}>Terminer</button></div>}
  </>);
}
