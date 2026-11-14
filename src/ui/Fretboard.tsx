import type { NoteRole } from '../theory/chords';

export type Mark = { role: NoteRole | 'plain' | 'ok' | 'slow' | 'bad' | 'unseen'; label?: string };
export interface FretboardProps {
  tuning: number[]; from?: number; to?: number; leftHanded?: boolean;
  marks?: Map<string, Mark>; live?: number | null; onTap?: (string: number, fret: number) => void; showAllTaps?: boolean;
}
export const ROLE_COLOR: Record<string, string> = {
  root: '#f87171', third: '#4ade80', fifth: '#60a5fa', seventh: '#c084fc', extension: '#94a3b8', avoid: '#fb923c', passing: '#64748b', plain: '#94a3b8',
  ok: '#4ade80', slow: '#facc15', bad: '#f87171', unseen: '#475569',
};
export const ROLE_NAME: Record<string, string> = {
  root: 'fondamentale', third: 'tierce', fifth: 'quinte', seventh: 'septième', extension: 'extension', avoid: 'à éviter', passing: 'passage', plain: 'note', ok: 'maîtrisée', slow: 'lente', bad: 'ratée', unseen: 'pas encore vue',
};
const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

/** Manche en SVG : couleur ET forme par fonction (lisible en daltonisme). */
export function Fretboard({ tuning, from = 0, to = 12, leftHanded, marks, live, onTap }: FretboardProps) {
  const n = tuning.length, fw = 64, sh = 40, pad = 36, open = from === 0 ? 40 : 0;
  const cols = to - from + 1 - (from === 0 ? 1 : 0);
  const W = open + cols * fw + 20, H = pad + (n - 1) * sh + 40;
  const X = (x: number) => (leftHanded ? W - x : x);
  const xFret = (f: number) => (f === 0 ? open / 2 : open + (f - (from === 0 ? 1 : from) + 0.5) * fw);
  const yStr = (s: number) => pad / 2 + 10 + (n - 1 - s) * sh;
  const lines = [];
  for (let i = 0; i <= cols; i++) lines.push(X(open + i * fw));
  const shape = (cx: number, cy: number, role: string, color: string, live: boolean) => {
    const r = 15, st = live ? '#fff' : 'rgba(0,0,0,.5)', sw = live ? 4 : role === 'root' ? 3 : 1.5;
    switch (role) {
      case 'third': return <rect x={cx - r + 2} y={cy - r + 2} width={2 * r - 4} height={2 * r - 4} transform={`rotate(45 ${cx} ${cy})`} fill={color} stroke={st} stroke-width={sw} />;
      case 'fifth': return <rect x={cx - r + 1} y={cy - r + 1} width={2 * r - 2} height={2 * r - 2} rx="3" fill={color} stroke={st} stroke-width={sw} />;
      case 'seventh': return <polygon points={`${cx},${cy - r} ${cx + r},${cy + r - 3} ${cx - r},${cy + r - 3}`} fill={color} stroke={st} stroke-width={sw} />;
      case 'avoid': return <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke={color} stroke-width="3" stroke-dasharray="4 3" />;
      case 'root': return <circle cx={cx} cy={cy} r={r + 1} fill={color} stroke={live ? '#fff' : '#fff'} stroke-width={sw} />;
      default: return <circle cx={cx} cy={cy} r={r - 3} fill={color} stroke={st} stroke-width={sw} />;
    }
  };
  const cells = [];
  for (let s = 0; s < n; s++) for (let f = from; f <= to; f++) {
    const m = marks?.get(`${s}:${f}`); const isLive = live != null && tuning[s] + f === live;
    if (!m && !isLive && !onTap) continue;
    const cx = X(xFret(f)), cy = yStr(s);
    cells.push(<g key={`${s}:${f}`} onClick={() => onTap?.(s, f)} style={onTap ? 'cursor:pointer' : ''}>
      <rect x={cx - fw / 2} y={cy - sh / 2} width={fw} height={sh} fill="transparent" />
      {(m || isLive) && shape(cx, cy, m?.role ?? 'plain', ROLE_COLOR[m?.role ?? 'plain'], isLive)}
      {m?.label && <text x={cx} y={cy + 5} text-anchor="middle" font-size="13" font-weight="700" fill="#0b0f14" style="pointer-events:none">{m.label}</text>}
    </g>);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style="width:100%;height:auto;background:var(--panel);border-radius:12px" role="img" aria-label="Manche de basse">
      {from === 0 && <rect x={X(open) - (leftHanded ? -2 : 5)} y={yStr(n - 1) - 6} width="7" height={(n - 1) * sh + 12} fill="var(--text)" />}
      {lines.map(x => <line x1={x} x2={x} y1={yStr(n - 1) - 6} y2={yStr(0) + 6} stroke="var(--muted)" stroke-width="2" />)}
      {Array.from({ length: n }, (_, s) => <line x1={X(from === 0 ? 8 : 0)} x2={X(W - 10)} y1={yStr(s)} y2={yStr(s)} stroke="var(--muted)" stroke-width={1 + (n - 1 - s) * 0.5 + 1} />)}
      {Array.from({ length: to - from + 1 }, (_, i) => from + i).filter(f => f > 0 && INLAYS.includes(f)).map(f =>
        <text x={X(xFret(f))} y={H - 8} text-anchor="middle" fill="var(--muted)" font-size="14">{f}</text>)}
      {cells}
    </svg>
  );
}
