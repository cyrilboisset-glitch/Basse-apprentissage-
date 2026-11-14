import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { buildSession, totalMinutes, type Step } from '../progress/session';
import { evaluateLevels } from '../progress/levels';
import { loadProgress, getPlacement } from '../storage/progress';
import { db } from '../storage/db';
import { today } from '../storage/stats';
import { DrillRunner } from './MancheExercices';
import { ImproRunner } from './Impro';
import { GrooveRun } from './Groove';
import { PhraseDetail } from './Vocabulaire';
import { EarQuiz } from './Oreille';
import { LessonRunner } from './Theory';
import { getEx } from '../exercises/impro';
import { getPattern } from '../exercises/groove';
import { getPhrase } from '../exercises/vocab';

export function Session({ s, onClose }: { s: Settings; onClose: () => void }) {
  const [steps, setSteps] = useState<Step[] | null>(null); const [i, setI] = useState(-1); const [note, setNote] = useState(''); const [saved, setSaved] = useState(false);
  const t0 = useRef(0);
  useEffect(() => { (async () => { const d = await loadProgress(); const pl = await getPlacement(); setSteps(buildSession(s.sessionMinutes, d, Math.max(evaluateLevels(d).current, pl?.level ?? 1), Math.random, s.unlockAll)); })(); }, []);
  if (!steps) return <p>Préparation de votre séance…</p>;
  const next = () => setI(x => x + 1);
  const finish = async () => { await db.journal.add({ date: today(), text: note.trim(), minutes: Math.round((performance.now() - t0.current) / 60000) }); setSaved(true); };
  if (i < 0) return (<>
    <h1>Séance du jour — {totalMinutes(steps)} min</h1>
    <div class="card">{steps.map((st, k) => <div style="display:flex;justify-content:space-between;padding:6px 0"><span>{k + 1}. {st.title}</span><span class="muted">{st.minutes} min</span></div>)}</div>
    <p class="muted">Casque branché, Plug Pro en USB. Chaque étape démarre quand vous appuyez sur Démarrer ; « Passer l'étape » est toujours possible.</p>
    <button class="btn primary" onClick={() => { t0.current = performance.now(); next(); }}>C'est parti</button><button class="btn" style="margin-top:8px" onClick={onClose}>Plus tard</button></>);
  if (i >= steps.length) return (<>
    <h1>Séance terminée 🎉</h1>
    <div class="card"><label style="display:block">Note de séance (facultatif)</label>
      <textarea style="width:100%;min-height:90px;font-size:1rem" placeholder="Ce qui a marché, ce qui coince, à retravailler…" value={note} onInput={e => setNote((e.target as HTMLTextAreaElement).value)} disabled={saved} />
      {!saved ? <button class="btn primary" style="margin-top:8px" onClick={finish}>Enregistrer dans mon journal</button> : <p role="status">Enregistré ✔</p>}</div>
    <button class="btn" onClick={onClose}>Retour à l'accueil</button></>);
  const st = steps[i];
  const bar = <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px" aria-label="Progression de la séance">
    <span class="muted">Étape {i + 1}/{steps.length} · {st.minutes} min</span><button class="btn" style="width:auto;min-height:40px;padding:0 14px" onClick={next}>Passer l'étape</button></div>;
  const body = (() => {
    switch (st.type) {
      case 'warmup': return <GrooveRun key={i} s={s} p={getPattern(st.pattern)} onExit={next} />;
      case 'manche': return <DrillRunner key={i} s={s} kind={st.kind} zoneId={st.zone} onExit={next} />;
      case 'theory': return <LessonRunner key={i} s={s} lessonId={st.lesson} onExit={next} />;
      case 'vocab': return <PhraseDetail key={i} s={s} base={getPhrase(st.phrase)!} onExit={next} />;
      case 'groove': return <GrooveRun key={i} s={s} p={getPattern(st.pattern)} onExit={next} />;
      case 'impro': return <ImproRunner key={i} s={s} ex={getEx(st.ex)} onExit={next} />;
      case 'ear': return <EarQuiz key={i} s={s} kind={st.kind} onExit={next} />;
    }
  })();
  return <>{bar}<div class="muted" style="margin-bottom:4px">{st.title}</div>{body}</>;
}
