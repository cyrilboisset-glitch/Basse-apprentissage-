import { useEffect, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { loadProgress, getPlacement } from '../storage/progress';
import { evaluateLevels, nextObjective, LEVELS } from '../progress/levels';
import { computeStreak, weeklyMinutes } from '../progress/streak';
import { practiceDays, type ProgressData } from '../progress/data';
import { earnedBadges, BADGES } from '../progress/badges';
import { totalMinutes } from '../progress/session';
import { getPlan } from './plan';
import { Icon } from './Icon';

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function Home({ s, set }: { s: Settings; set: (p: Partial<Settings>) => void }) {
  const [d, setD] = useState<ProgressData | null>(null); const [pl, setPl] = useState<number>(1);
  useEffect(() => { loadProgress().then(setD); getPlacement().then(p => setPl(p?.level ?? 1)); }, []);
  const st = d ? computeStreak(practiceDays(d), d.today) : null;
  const week = d ? weeklyMinutes([...d.drills, ...d.sessions].map(x => ({ date: x.date, seconds: (x as any).seconds ?? 0 })), 1, d.today)[0].minutes : 0;
  const lv = d ? Math.min(LEVELS.length, Math.max(evaluateLevels(d).current, pl)) : 1;
  const plan = d ? getPlan(s.sessionMinutes, d, Math.max(evaluateLevels(d).current, pl), s.unlockAll) : [];
  const now = new Date();
  return (<>
    <div class="muted" style="font-size:.9rem">{DAYS[now.getDay()][0].toUpperCase() + DAYS[now.getDay()].slice(1)} {now.getDate()} {MONTHS[now.getMonth()]}</div>
    <h1 style="margin-top:2px">Séance du jour</h1>

    <div class="seg" role="group" aria-label="Durée de la séance" style="margin-bottom:12px">
      {([10, 20, 30] as const).map(m => <button aria-pressed={s.sessionMinutes === m} onClick={() => set({ sessionMinutes: m })}>{m} min</button>)}
    </div>

    <div class="card" style="padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:1.05rem;font-weight:600">Au programme</b><span class="num muted">{plan.length ? totalMinutes(plan) : s.sessionMinutes} min</span></div>
      <ol style="list-style:none;margin:8px 0 14px;padding:0">
        {plan.map((p, i) => <li style={`display:flex;align-items:center;gap:12px;min-height:44px;${i < plan.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}`}>
          <span class="num muted" style="width:24px;height:24px;border-radius:50%;border:1px solid var(--border-strong);display:grid;place-items:center;font-size:.75rem;flex-shrink:0">{i + 1}</span>
          <span style="flex:1;font-size:.95rem">{p.title}</span><span class="num muted" style="font-size:.85rem">{p.minutes}</span></li>)}
      </ol>
      <a class="btn primary" href="#/seance"><Icon name="play" size={20} />Démarrer la séance</a>
    </div>

    {d && st && <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0">
      {([[st.days, st.days > 1 ? 'jours de suite' : 'jour de suite'], [week, 'min cette semaine'], [lv, 'niveau']] as [number, string][]).map(([v, l]) =>
        <div class="card" style="margin:0;padding:12px"><div class="num" style="font-size:1.5rem;font-weight:500">{v}</div><div class="muted" style="font-size:.8rem;line-height:1.3">{l}</div></div>)}
    </div>}
    {st?.atRisk && <p role="alert" class="bad">Votre série est en danger : pratiquez aujourd'hui !</p>}
    {st && <p class="muted" style="font-size:.85rem;margin-top:-4px">Un joker par semaine : une journée manquée ne casse pas la série.{st.practicedToday ? ' Séance du jour faite.' : ''}</p>}

    {d && <a class="card" href="#/bord" style="display:flex;align-items:center;gap:12px">
      <span style="flex:1"><span style="display:block;font-size:.75rem;font-weight:600;letter-spacing:.06em;color:var(--accent)">PROCHAIN OBJECTIF</span><span style="display:block;margin-top:2px">{nextObjective(d)}</span>
        <span class="muted" style="display:block;font-size:.8rem;margin-top:4px">Niveau {lv} : {LEVELS[lv - 1]?.goal} · Badges {earnedBadges(d).length} / {BADGES.length}</span></span>
      <span class="muted"><Icon name="chevron" size={20} /></span></a>}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
      <a class="btn" href="#/bord">Tableau de bord</a>
      <a class="btn" href="#/placement">Test de positionnement</a></div>
  </>);
}
