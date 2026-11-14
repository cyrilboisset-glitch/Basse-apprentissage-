import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { LESSONS, CHAPTERS, getLesson, lessonsOf, type Lesson } from '../exercises/theory';
import { applyNote, newState, type Round, type RoundState } from '../exercises/manche';
import { useNotes } from './useNotes';
import { STATUS_MSG, useEngineStatus } from './useEngine';
import { db } from '../storage/db';
import { today } from '../storage/stats';
import { midiName } from '../audio/notes';
import { keepAwake } from './wakeLock';
import { useFocus } from './focus';
import { Icon } from './Icon';
import { RhythmPlay } from './RhythmLesson';

export const VALIDATED = 70;
/** Meilleur score de chaque leçon (module `theory:<id>`). */
export async function lessonScores(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  (await db.sessions.where('module').startsWith('theory:').toArray()).forEach(r => { const id = r.module.slice(7); out[id] = Math.max(out[id] ?? -1, r.score ?? 0); });
  return out;
}
export const nextLessonId = (scores: Record<string, number>) => (LESSONS.find(l => (scores[l.id] ?? -1) < VALIDATED) ?? LESSONS[0]).id;

export function Theorie({ s }: { s: Settings }) {
  const [id, setId] = useState<string | null>(null); const [scores, setScores] = useState<Record<string, number>>({});
  useEffect(() => { lessonScores().then(setScores); }, [id]);
  if (id) return <LessonRunner s={s} lessonId={id} onExit={() => setId(null)} onNext={nid => setId(nid)} />;
  const done = LESSONS.filter(l => (scores[l.id] ?? -1) >= VALIDATED).length, nid = nextLessonId(scores), next = getLesson(nid);
  return (<>
    <h1>Théorie appliquée</h1>
    <p class="muted">Quatre chapitres dans l’ordre : une leçon de deux minutes, un quiz, puis un exercice joué tout de suite. <span class="num">{done} / {LESSONS.length}</span> leçons validées.</p>
    {done < LESSONS.length && <button class="card accent" style="width:100%;text-align:left;color:inherit;cursor:pointer" onClick={() => setId(nid)}>
      <span style="display:block;font-size:.75rem;font-weight:600;letter-spacing:.06em;color:var(--accent-text)">PROCHAINE LEÇON</span><b style="font-size:1.1rem;font-weight:600">{next.title}</b>
      <span class="muted" style="display:block;font-size:.85rem">Chapitre {next.chapter} · {CHAPTERS[next.chapter - 1].title}</span></button>}
    {CHAPTERS.map(c => { const ls = lessonsOf(c.n), n = ls.filter(l => (scores[l.id] ?? -1) >= VALIDATED).length;
      return <details class="section" open={c.n === next.chapter}><summary><span><b>{c.n}. {c.title}</b><span class="muted" style="display:block;font-size:.8rem;font-weight:400">{c.sub}</span></span><span class="num muted" style="font-size:.85rem;margin-left:auto;margin-right:12px">{n}/{ls.length}</span></summary>
        <div class="body">{ls.map(l => { const sc = scores[l.id]; const ok = (sc ?? -1) >= VALIDATED;
          return <button class="choice" onClick={() => setId(l.id)}><span>{l.title}<small>{sc === undefined ? 'Pas encore faite' : ok ? `Validée · ${sc} %` : `À revoir · ${sc} %`}</small></span>
            <span class={ok ? 'ok' : 'muted'}>{ok ? <Icon name="check" size={22} label="Validée" /> : <Icon name="chevron" size={20} />}</span></button>; })}</div></details>; })}
  </>);
}

type Step = { kind: 'seq'; round: Round } | { kind: 'rhythm'; spec: import('../exercises/rhythm').RhythmSpec };

export function LessonRunner({ s, lessonId, onExit, onNext }: { s: Settings; lessonId: string; onExit: () => void; onNext?: (id: string) => void }) {
  const lesson: Lesson = getLesson(lessonId); const status = useEngineStatus();
  useFocus(true);
  useEffect(() => { keepAwake(true); return () => { keepAwake(false); }; }, []);
  const [built] = useState(() => lesson.build(Math.random, s.notation));
  const steps: Step[] = [...built.rounds.map(round => ({ kind: 'seq' as const, round })), ...(built.rhythms ?? []).map(spec => ({ kind: 'rhythm' as const, spec }))];
  const [phase, setPhase] = useState<'read' | 'quiz' | 'play' | 'done'>('read'); const [qi, setQi] = useState(0); const [picked, setPicked] = useState<number | null>(null);
  const [ri, setRi] = useState(0); const [, tick] = useState(0); const [flash, setFlash] = useState<'ok' | 'wrong' | null>(null);
  const tot = useRef({ c: 0, w: 0 }); const rhy = useRef<number[]>([]); const st = useRef<RoundState>(newState());
  const quizOk = useRef(0), quizKo = useRef(0); const [score, setScore] = useState(0);
  const cur = steps[ri]; const round = cur?.kind === 'seq' ? cur.round : undefined;
  const next = () => { if (ri + 1 >= steps.length) setPhase('done'); else { setRi(ri + 1); st.current = newState(); setFlash(null); } };
  useNotes(phase === 'play' && !!round, s.refA, e => {
    if (e.midi === null || !round) return; const r = applyNote(round, st.current, e.midi); if (r === 'ignored') return;
    tot.current[r === 'ok' ? 'c' : 'w']++; setFlash(r); tick(x => x + 1); if (st.current.done) setTimeout(next, 600);
  }, s.inputDeviceId);
  useEffect(() => {
    if (phase !== 'done') return;
    const parts: number[] = []; const qn = quizOk.current + quizKo.current, { c, w } = tot.current;
    if (qn) parts.push(quizOk.current / qn); if (c + w) parts.push(c / (c + w)); if (rhy.current.length) parts.push(rhy.current.reduce((a, b) => a + b, 0) / rhy.current.length);
    const sc = parts.length ? Math.round(100 * parts.reduce((a, b) => a + b, 0) / parts.length) : 100; setScore(sc);
    db.sessions.add({ date: today(), module: `theory:${lesson.id}`, seconds: 180, score: sc });
  }, [phase]);
  const answer = (i: number) => { if (picked !== null) return; setPicked(i); if (i === built.quiz[qi].answer) quizOk.current++; else quizKo.current++; };
  const afterQuiz = () => { setPicked(null); if (qi + 1 < built.quiz.length) setQi(qi + 1); else if (steps.length) setPhase('play'); else setPhase('done'); };
  const idx = LESSONS.findIndex(l => l.id === lessonId), nextL = LESSONS[idx + 1];

  return (<>
    <div style="display:flex;align-items:center;gap:8px;margin:0 -8px"><button class="icon-btn" aria-label="Retour" onClick={onExit}><Icon name="back" /></button>
      <div class="muted" style="font-size:.85rem">Chapitre {lesson.chapter} · leçon {lessonsOf(lesson.chapter).findIndex(l => l.id === lessonId) + 1} / {lessonsOf(lesson.chapter).length}</div></div>
    <h1>{lesson.title}</h1>
    {phase === 'read' && <><div class="card">{lesson.text.map(t => <p>{t}</p>)}</div><button class="btn primary" onClick={() => setPhase(built.quiz.length ? 'quiz' : steps.length ? 'play' : 'done')}>J'ai lu : à l'exercice</button></>}
    {phase === 'quiz' && <div class="card"><div class="muted">Question {qi + 1} / {built.quiz.length}</div><p style="font-size:1.15rem">{built.quiz[qi].q}</p>
      {built.quiz[qi].choices.map((c, i) => <button class={'btn'} style={`margin:6px 0;height:auto;padding:10px 14px;text-align:left;justify-content:flex-start;${picked !== null ? (i === built.quiz[qi].answer ? 'background:var(--ok-bg);border-color:var(--ok)' : i === picked ? 'background:var(--bad-bg);border-color:var(--danger)' : '') : ''}`} disabled={picked !== null && i !== built.quiz[qi].answer && i !== picked} onClick={() => answer(i)}>{c}</button>)}
      {picked !== null && <button class="btn primary" style="margin-top:6px" onClick={afterQuiz}>Suivant</button>}</div>}
    {phase === 'play' && cur && <>{STATUS_MSG[status] && cur.kind === 'seq' && <div class="card" role="alert">{STATUS_MSG[status]}</div>}
      <div class="muted num" style="font-size:.9rem">Exercice {ri + 1} / {steps.length}</div>
      {cur.kind === 'seq' && round && <>
        <h2 class={flash === 'ok' ? 'flash-ok' : flash === 'wrong' ? 'flash-bad' : ''} style="border-radius:12px;padding:10px;font-size:1.05rem;margin-top:6px">{round.prompt.split('\n')[0]}</h2>
        {round.detail && <pre class="num card" style="margin:8px 0;padding:12px;overflow-x:auto;font-size:1rem" aria-label="Tablature">{round.detail}</pre>}
        <p style="font-size:1.4rem;text-align:center">{round.targets.map((m, i) => <span style={i < st.current.idx ? 'color:var(--ok)' : i === st.current.idx ? 'font-weight:800;text-decoration:underline' : 'opacity:.6'}>{midiName(m, s.notation).name} </span>)}</p>
        <button class="btn" onClick={() => { tot.current.w += round.targets.length - st.current.idx; next(); }}>Passer</button></>}
      {cur.kind === 'rhythm' && <RhythmPlay key={ri} s={s} spec={cur.spec} onDone={sx => { rhy.current.push(sx); next(); }} />}</>}
    {phase === 'done' && <div class="card" role="status"><h2>Leçon terminée</h2>
      <div class="num" style="font-size:2.2rem">{score} %</div>
      <p class={score >= VALIDATED ? 'ok' : 'muted'}>{score >= VALIDATED ? 'Leçon validée.' : `Pas encore validée (il faut ${VALIDATED} %) : relisez la leçon et recommencez.`}</p>
      <p class="muted">{quizOk.current} bonne(s) réponse(s) sur {quizOk.current + quizKo.current}{tot.current.c + tot.current.w > 0 ? ` · ${tot.current.c} note(s) juste(s), ${tot.current.w} erreur(s)` : ''}{rhy.current.length ? ` · rythmes : ${Math.round(100 * rhy.current.reduce((a, b) => a + b, 0) / rhy.current.length)} %` : ''}</p>
      {lesson.link && <a class="btn" style="margin-bottom:8px" href={lesson.link.href}>{lesson.link.label}</a>}
      {score >= VALIDATED && nextL && onNext && <button class="btn primary" style="margin-bottom:8px" onClick={() => onNext(nextL.id)}>Leçon suivante : {nextL.title}</button>}
      <button class="btn" onClick={onExit}>Terminer</button></div>}
  </>);
}
