import { useEffect, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { loadProgress } from '../storage/progress';
import { db, type JournalEntry } from '../storage/db';
import { evaluateLevels } from '../progress/levels';
import { BADGES } from '../progress/badges';
import { computeStreak, weeklyMinutes } from '../progress/streak';
import { noteSd, practiceDays, type ProgressData } from '../progress/data';
import { Carte } from './MancheExercices';
import { Icon } from './Icon';

export function Dashboard({ s }: { s: Settings }) {
  const [d, setD] = useState<ProgressData | null>(null); const [j, setJ] = useState<JournalEntry[]>([]);
  useEffect(() => { loadProgress().then(setD); db.journal.orderBy('date').reverse().limit(10).toArray().then(setJ); }, []);
  if (!d) return <p>Chargement…</p>;
  const wk = weeklyMinutes([...d.drills, ...d.sessions].map(x => ({ date: x.date, seconds: (x as any).seconds ?? 0 })), 8, d.today); const max = Math.max(30, ...wk.map(w => w.minutes));
  const { states, current } = evaluateLevels(d); const st = computeStreak(practiceDays(d), d.today);
  const sds = d.sessions.filter(x => x.module.startsWith('groove:') && !Number.isNaN(noteSd(x))).map(x => noteSd(x)).slice(-20);
  const earned = new Set(BADGES.filter(b => b.earned(d)).map(b => b.id));
  return (<>
    <a href="#/" class="btn ghost sm" style="margin-left:-14px"><Icon name="back" size={18} />Accueil</a><h1>Tableau de bord</h1>
    <div class="card"><h2>Temps de pratique par semaine</h2>
      <svg viewBox="0 0 320 130" style="width:100%" role="img" aria-label="Minutes de pratique par semaine">
        {wk.map((w, i) => <g><rect x={12 + i * 38} y={105 - (w.minutes / max) * 90} width="28" height={(w.minutes / max) * 90} rx="4" fill="var(--accent)" /><text x={26 + i * 38} y={100 - (w.minutes / max) * 90} text-anchor="middle" font-size="11" fill="var(--text)">{w.minutes || ''}</text><text x={26 + i * 38} y="122" text-anchor="middle" font-size="9" fill="var(--muted)">{w.week.slice(-3)}</text></g>)}</svg>
      <p class="muted">Série : {st.days} jour(s) · jokers utilisés : {st.jokersUsed}</p></div>
    <div class="card"><h2>Progression par niveau</h2>
      {states.map(x => <details open={x.level.n === current}><summary style="min-height:44px;display:flex;align-items:center"><span style="display:inline-flex;width:22px;margin-right:8px" class={x.done ? 'ok' : ''}>{x.done ? <Icon name="check" size={20} label="Validé" /> : x.level.n === current ? <Icon name="play" size={14} label="En cours" /> : <span class="muted">○</span>}</span>Niveau {x.level.n} — {x.level.title}</summary>
        <p class="muted">{x.level.goal}</p>{x.criteria.map(c => <div style="display:flex;gap:8px;align-items:center;min-height:30px"><span class={c.ok ? 'ok' : 'muted'} style="display:flex"><Icon name={c.ok ? 'check' : 'x'} size={16} label={c.ok ? 'Fait' : 'À faire'} /></span>{c.label}</div>)}</details>)}</div>
    <div class="card"><h2>Régularité (écart-type en ms, plus bas = mieux)</h2>
      {sds.length < 2 ? <p class="muted">Faites quelques exercices de groove pour voir votre évolution.</p> :
        <svg viewBox="0 0 320 110" style="width:100%" role="img" aria-label="Évolution de la régularité"><polyline fill="none" stroke="var(--accent)" stroke-width="2" points={sds.map((v, i) => `${10 + i * 300 / (sds.length - 1)},${100 - Math.min(80, v) * 1.1}`).join(' ')} />
          {sds.map((v, i) => <circle cx={10 + i * 300 / (sds.length - 1)} cy={100 - Math.min(80, v) * 1.1} r="3" fill="var(--accent)" />)}</svg>}</div>
    <div class="card"><h2>Carte du manche</h2><Carte s={s} /></div>
    <div class="card"><h2>Badges</h2>{BADGES.map(b => <div style={`padding:6px 0;${earned.has(b.id) ? '' : 'border-left:3px dashed var(--border);padding-left:8px'}`}><span class={earned.has(b.id) ? 'ok' : 'muted'} style="display:inline-flex;vertical-align:middle;margin-right:8px"><Icon name={earned.has(b.id) ? 'trophy' : 'lock'} size={18} /></span><b>{b.name}</b> <span class="muted">— {b.how}{earned.has(b.id) ? ' (obtenu)' : ' (à gagner)'}</span></div>)}</div>
    <div class="card"><h2>Journal de pratique</h2>{j.length === 0 ? <p class="muted">Aucune note pour l'instant : elles s'ajoutent à la fin de chaque séance.</p> : j.map(e => <p><b>{e.date}</b> · {e.minutes} min<br />{e.text || <span class="muted">(sans note)</span>}</p>)}</div>
  </>);
}
