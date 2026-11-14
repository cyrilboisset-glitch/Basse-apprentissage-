import { useEffect, useRef, useState } from 'preact/hooks';
import type { Settings } from '../storage/settings';
import { getTuning, midiName } from '../audio/notes';
import { ZONES, allPositions } from '../theory/fretboard';
import { Fretboard, ROLE_COLOR, ROLE_NAME, type Mark } from './Fretboard';
import { useNotes } from './useNotes';
import { applyNote, DRILL_LABEL, heatStatus, makeRound, newState, unlockedZones, zoneMastered, type DrillKind, type Round, type RoundState } from '../exercises/manche';
import { loadSrs, recordSrs } from '../storage/srs';
import { allDrills, allNoteStats, recordNote, saveDrill, today } from '../storage/stats';
import type { Drill, NoteStat, SrsItem } from '../storage/db';
import { STATUS_MSG, useEngineStatus } from './useEngine';
import { pc } from '../theory/scales';
import { applyPresetFor } from '../nux/presets';
import { keepAwake } from './wakeLock';

const KINDS = Object.keys(DRILL_LABEL) as DrillKind[];
const ROUNDS = 8;

export function Exercices({ s }: { s: Settings }) {
  const [drills, setDrills] = useState<Drill[]>([]);
  const [zone, setZone] = useState('z0'); const [kind, setKind] = useState<DrillKind>('hunt');
  const [run, setRun] = useState(false);
  const reload = () => allDrills().then(setDrills);
  useEffect(() => { reload(); }, [run]);
  const open = unlockedZones(drills, s.unlockAll);
  if (run) return <DrillRunner s={s} kind={kind} zoneId={zone} onExit={() => setRun(false)} />;
  return (<>
    <div class="card"><h2>Zone</h2>
      {ZONES.map(z => {
        const last = drills.filter(d => d.zone === z.id).slice(-3); const locked = !open.includes(z.id);
        const avg = last.length ? Math.round(last.reduce((a, d) => a + d.accuracy, 0) / last.length * 100) : null;
        return <label><span><input type="radio" name="zone" disabled={locked} checked={zone === z.id} onChange={() => setZone(z.id)} /> {locked ? '🔒 ' : ''}{z.label}</span>
          <span class="muted">{zoneMastered(drills, z.id) ? '✔ validée' : avg === null ? '—' : `${avg} % (${last.length}/3 séances)`}</span></label>;
      })}
      <p class="muted">Zone suivante débloquée à 90 % de réussite en moyenne sur 3 séances.</p>
    </div>
    <div class="card"><h2>Exercice</h2>
      {KINDS.map(k => <label><span><input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} /> {DRILL_LABEL[k]}</span></label>)}
    </div>
    <button class="btn primary" onClick={() => setRun(true)}>Commencer ({k2n(kind)} manches)</button>
  </>);
}
const k2n = (k: DrillKind) => (k === 'quiz' ? 12 : ROUNDS);

export function DrillRunner({ s, kind, zoneId, onExit }: { s: Settings; kind: DrillKind; zoneId: string; onExit: () => void }) {
  const tuning = getTuning(s.tuning).midi, z = ZONES.find(x => x.id === zoneId)!;
  const total = k2n(kind), audio = kind !== 'quiz';
  const [idx, setIdx] = useState(0); const [, tick] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'wrong' | null>(null);
  const [summary, setSummary] = useState<{ acc: number; correct: number; wrong: number; sec: number; unlocked: string | null } | null>(null);
  const status = useEngineStatus();
  const srs = useRef<Map<string, SrsItem>>(new Map());
  const round = useRef<Round | null>(null); const st = useRef<RoundState>(newState());
  const t0 = useRef(performance.now()); const tLast = useRef(performance.now()); const sess0 = useRef(performance.now());
  const tot = useRef({ c: 0, w: 0 }); const lock = useRef(false);
  const mk = () => makeRound(kind, { tuning, frets: s.frets, zone: { from: z.from, to: z.to }, notation: s.notation, srs: srs.current, rng: Math.random });

  useEffect(() => { keepAwake(true); return () => { keepAwake(false); }; }, []);
  useEffect(() => { applyPresetFor('clean', s); loadSrs().then(m => { srs.current = m; round.current = mk(); st.current = newState(); t0.current = tLast.current = performance.now(); tick(x => x + 1); }); }, []);

  const finishRound = async (ok: boolean) => {
    const r = round.current!; if (r.srsId) await recordSrs(r.srsId, ok);
    if (idx + 1 >= total) return finishSession();
    setTimeout(() => { round.current = mk(); st.current = newState(); t0.current = tLast.current = performance.now(); lock.current = false; setFlash(null); setIdx(i => i + 1); }, 700);
  };
  const finishSession = async () => {
    const { c, w } = tot.current; const acc = c + w ? c / (c + w) : 0; const sec = Math.round((performance.now() - sess0.current) / 1000);
    const before = unlockedZones(await allDrills(), s.unlockAll);
    await saveDrill({ date: today(), kind, zone: zoneId, accuracy: acc, correct: c, wrong: w, seconds: sec });
    const after = unlockedZones(await allDrills(), s.unlockAll);
    const nz = after.find(x => !before.includes(x));
    setSummary({ acc, correct: c, wrong: w, sec, unlocked: nz ? ZONES.find(x => x.id === nz)!.label : null });
  };
  const onNote = (e: { midi: number | null }) => {
    const r = round.current; if (!r || e.midi === null || lock.current || summary) return;
    const res = applyNote(r, st.current, e.midi); if (res === 'ignored') return;
    const now = performance.now();
    if (res === 'ok') { tot.current.c++; recordNote(e.midi, true, now - tLast.current); tLast.current = now; setFlash('ok'); }
    else {
      tot.current.w++; setFlash('wrong');
      const exp = r.ordered ? r.targets[st.current.idx] : r.targets.find(t => !st.current.found.has(t));
      if (exp !== undefined) recordNote(exp, false, 0);
    }
    tick(x => x + 1);
    if (st.current.done) { lock.current = true; finishRound(true); }
  };
  useNotes(audio && !summary, s.refA, onNote, s.inputDeviceId);

  const skip = () => {
    const r = round.current!; if (lock.current) return; lock.current = true;
    const left = r.ordered ? r.targets.length - st.current.idx : r.any ? 1 : r.targets.length - st.current.found.size;
    tot.current.w += left; finishRound(false);
  };
  const answer = (p: number) => {
    const r = round.current!; if (lock.current) return; lock.current = true;
    const ok = p === r.quizPc; tot.current[ok ? 'c' : 'w']++; setFlash(ok ? 'ok' : 'wrong');
    recordNote(r.targets[0], ok, performance.now() - t0.current); finishRound(ok);
  };

  if (summary) return (<div class="card" role="status">
    <h1>{summary.acc >= 0.9 ? 'Bravo !' : summary.acc >= 0.7 ? 'Bien joué' : 'On continue'}</h1>
    <p style="font-size:2.4rem;font-weight:800">{Math.round(summary.acc * 100)} %</p>
    <p>{summary.correct} justes · {summary.wrong} erreurs · {summary.sec} s</p>
    {summary.unlocked && <p><b>🔓 Zone débloquée : {summary.unlocked}</b></p>}
    <button class="btn primary" onClick={onExit}>Terminer</button></div>);
  const r = round.current; if (!r) return <p>Chargement…</p>;
  const marks = new Map<string, Mark>();
  r.show.forEach((p, i) => marks.set(`${p.string}:${p.fret}`, { role: r.kind === 'quiz' ? 'plain' : (i === 0 && r.kind === 'interval' ? 'root' : 'plain'), label: r.kind === 'quiz' ? '' : midiName(p.midi, s.notation).name }));
  const done = r.ordered ? st.current.idx : st.current.found.size;
  const need = r.any ? 1 : r.targets.length;
  return (<>
    <div style="display:flex;justify-content:space-between"><span>Manche {idx + 1}/{total}</span><button class="btn" style="width:auto;min-height:40px;padding:0 16px" onClick={onExit}>Quitter</button></div>
    {audio && STATUS_MSG[status] && <div class="card" role="alert">{STATUS_MSG[status]}</div>}
    <h1 style={`text-align:center;border-radius:12px;padding:8px;${flash === 'ok' ? 'background:#14532d' : flash === 'wrong' ? 'background:#7f1d1d' : ''}`}>{r.prompt}</h1>
    <Fretboard tuning={tuning} from={r.kind === 'quiz' || r.kind === 'interval' || r.kind === 'scale' || r.kind === 'arpeggio' ? Math.max(0, Math.min(...r.show.map(p => p.fret), z.from) - 0) : z.from} to={Math.min(z.to + (r.kind === 'interval' ? 3 : 0), s.frets, 24)} leftHanded={s.leftHanded} marks={marks} />
    {audio && <p style="text-align:center;font-size:1.3rem">{need > 1 || r.ordered ? `${done} / ${r.ordered ? r.targets.length : need} notes` : 'Jouez la note'}</p>}
    {kind === 'quiz'
      ? <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">{Array.from({ length: 12 }, (_, p) => <button class="btn" onClick={() => answer(p)}>{midiName(p + 12, s.notation).name}</button>)}</div>
      : <button class="btn" onClick={skip}>Passer</button>}
  </>);
}

export function Carte({ s }: { s: Settings }) {
  const tuning = getTuning(s.tuning).midi;
  const [stats, setStats] = useState<Map<number, NoteStat>>(new Map());
  const [half, setHalf] = useState<0 | 1>(0);
  useEffect(() => { allNoteStats().then(setStats); }, []);
  const marks = new Map<string, Mark>(); const counts: Record<string, number> = { ok: 0, slow: 0, bad: 0, unseen: 0 };
  for (const p of allPositions(tuning, s.frets)) {
    const h = heatStatus(stats.get(p.midi)); counts[h]++;
    marks.set(`${p.string}:${p.fret}`, { role: h, label: { ok: '✓', slow: '⏱', bad: '✗', unseen: '·' }[h] });
  }
  void pc;
  return (<>
    <Fretboard tuning={tuning} from={half ? 12 : 0} to={half ? Math.min(24, s.frets) : 12} leftHanded={s.leftHanded} marks={marks} />
    <button class="btn" style="margin:8px 0" onClick={() => setHalf(h => (h ? 0 : 1))}>{half ? 'Cases 0 – 12' : 'Cases 12 – 24'}</button>
    <div style="display:flex;flex-wrap:wrap;gap:12px">{(['ok', 'slow', 'bad', 'unseen'] as const).map(k =>
      <span><span style={`display:inline-block;width:14px;height:14px;border-radius:50%;background:${ROLE_COLOR[k]}`} /> {ROLE_NAME[k]} ({counts[k]})</span>)}</div>
    <p class="muted">Maîtrisée : ≥ 90 % de réussite. Lente : plus de 3 s en moyenne. Ratée : moins de 70 %. Les notes sont suivies par hauteur : une même note jouée sur deux cordes compte pour ses deux positions.</p>
  </>);
}
