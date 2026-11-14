import { useEffect, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { loadProgress, getPlacement } from '../storage/progress';
import { evaluateLevels, nextObjective, LEVELS } from '../progress/levels';
import { computeStreak, weeklyMinutes } from '../progress/streak';
import { practiceDays, type ProgressData } from '../progress/data';
import { earnedBadges, BADGES } from '../progress/badges';

export function Home({ s, set }: { s: Settings; set: (p: Partial<Settings>) => void }) {
  const [d, setD] = useState<ProgressData | null>(null); const [pl, setPl] = useState<number>(1);
  useEffect(() => { loadProgress().then(setD); getPlacement().then(p => setPl(p?.level ?? 1)); }, []);
  const st = d ? computeStreak(practiceDays(d), d.today) : null;
  const week = d ? weeklyMinutes([...d.drills, ...d.sessions].map(x => ({ date: x.date, seconds: (x as any).seconds ?? 0 })), 1, d.today)[0].minutes : 0;
  const lv = d ? Math.min(LEVELS.length, Math.max(evaluateLevels(d).current, pl)) : 1;
  return (<>
    <h1>BassLab</h1>
    <a class="btn primary" href="#/seance" style="display:grid;place-items:center;text-decoration:none">Démarrer ma séance ({s.sessionMinutes} min)</a>
    <div style="display:flex;gap:8px;margin:8px 0" role="group" aria-label="Durée de la séance">
      {([10, 20, 30] as const).map(m => <button class="btn" aria-pressed={s.sessionMinutes === m} style={`min-height:48px;${s.sessionMinutes === m ? 'background:var(--accent);color:var(--on-accent)' : ''}`} onClick={() => set({ sessionMinutes: m })}>{m} min</button>)}
    </div>
    {d && st && <div class="card">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:8px">
        <div><div style="font-size:2rem;font-weight:800">{st.days}</div><div class="muted">jour{st.days > 1 ? 's' : ''} de suite{st.practicedToday ? ' ✔' : ''}</div></div>
        <div><div style="font-size:2rem;font-weight:800">{week}</div><div class="muted">min cette semaine</div></div>
        <div><div style="font-size:2rem;font-weight:800">{lv}</div><div class="muted">niveau</div></div></div>
      {st.atRisk && <p role="alert" style="color:var(--danger)">Votre série est en danger : pratiquez aujourd'hui !</p>}
      <p class="muted">Un joker par semaine : une journée manquée ne casse pas la série.</p></div>}
    {d && <div class="card"><b>Prochain objectif</b><p>{nextObjective(d)}</p><div class="muted">Niveau {lv} : {LEVELS[lv - 1]?.goal}</div></div>}
    {d && <div class="card"><b>Badges : {earnedBadges(d).length} / {BADGES.length}</b></div>}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <a class="btn" href="#/bord" style="display:grid;place-items:center;text-decoration:none">Tableau de bord</a>
      <a class="btn" href="#/placement" style="display:grid;place-items:center;text-decoration:none">Test de positionnement</a></div>
    <p class="muted" style="margin-top:16px">Accordeur : bouton ♩ en bas à droite.</p>
  </>);
}
