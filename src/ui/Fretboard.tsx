import { useRef } from 'preact/hooks';
import type { NoteRole } from '../theory/chords';

export type Mark = { role: NoteRole | 'plain' | 'ok' | 'slow' | 'bad' | 'unseen'; label?: string };
export interface FretboardProps {
  tuning: number[]; from?: number; to?: number; leftHanded?: boolean;
  marks?: Map<string, Mark>; live?: number | null; onTap?: (string: number, fret: number) => void; showAllTaps?: boolean;
}

// Teintes désaturées posées sur le bois ; la forme et l'étiquette portent l'information (daltonisme).
export const ROLE_COLOR: Record<string, string> = {
  root: '#E8946A', third: '#E6C873', fifth: '#8FB8DC', seventh: '#B9A6D6', extension: '#BDB6AA', avoid: '#E07B6F', passing: '#8A857C', plain: '#BDB6AA',
  ok: '#86B98F', slow: '#E6C873', bad: '#E07B6F', unseen: '#8A857C',
};
export const ROLE_NAME: Record<string, string> = {
  root: 'fondamentale', third: 'tierce', fifth: 'quinte', seventh: 'septième', extension: 'extension', avoid: 'à éviter', passing: 'passage', plain: 'note',
  ok: 'maîtrisée', slow: 'lente', bad: 'ratée', unseen: 'pas encore vue',
};
const INK = '#1A1410';
const INLAY_SINGLE = [3, 5, 7, 9, 15, 17, 19, 21], INLAY_DOUBLE = [12, 24];
const NUMBERED = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

/** Forme d'une note (centre cx,cy). Fondamentale = cercle cerclé, tierce = losange, quinte = carré arrondi, septième = triangle. */
function Shape({ role, cx, cy }: { role: string; cx: number; cy: number }) {
  const c = ROLE_COLOR[role] ?? ROLE_COLOR.plain;
  switch (role) {
    case 'root': return <circle cx={cx} cy={cy} r="17" fill={c} stroke="#F6E3D2" stroke-width="2.5" />;
    case 'third': return <polygon points={`${cx},${cy - 21} ${cx + 21},${cy} ${cx},${cy + 21} ${cx - 21},${cy}`} fill={c} stroke-linejoin="round" />;
    case 'fifth': return <rect x={cx - 16} y={cy - 16} width="32" height="32" rx="9" fill={c} />;
    case 'seventh': return <polygon points={`${cx},${cy - 19} ${cx + 21},${cy + 16} ${cx - 21},${cy + 16}`} fill={c} stroke={c} stroke-width="3" stroke-linejoin="round" />;
    case 'avoid': return <circle cx={cx} cy={cy} r="15" fill="rgba(21,21,21,.55)" stroke={c} stroke-width="2.5" stroke-dasharray="4 3" />;
    case 'ok': case 'slow': case 'bad': case 'unseen': return <circle cx={cx} cy={cy} r="15" fill={c} />;
    default: return <circle cx={cx} cy={cy} r="13.5" fill={c} />;
  }
}
const labelY = (role: string, cy: number) => (role === 'seventh' ? cy + 7 : cy + 0.5);

/** Petite pastille de légende (même forme que sur le manche). */
export function RoleGlyph({ role, size = 22 }: { role: string; size?: number }) {
  return <svg width={size} height={size} viewBox="-24 -24 48 48" aria-hidden="true" style="flex-shrink:0"><Shape role={role} cx={0} cy={0} /></svg>;
}

let uid = 0;
/**
 * Manche réaliste (touche en palissandre, sillet en os, frettes en nickel à l'échelle réelle,
 * repères nacrés, cordes filées). La largeur s'adapte ; en dessous de 80 % de sa taille naturelle il défile.
 */
export function Fretboard({ tuning, from = 0, to = 12, leftHanded, marks, live, onTap }: FretboardProps) {
  const id = useRef('fb' + ++uid).current;
  const n = tuning.length, a = from === 0 ? 0 : from - 1, b = Math.max(to, a + 1);
  const OZ = from === 0 ? 66 : 0, R = 16, span = b - a;
  const VW = OZ + R + Math.round(span * 66);
  const gap = n <= 4 ? 50 : n === 5 ? 44 : 40, pad = 34, H = pad * 2 + gap * (n - 1);
  const sc = (k: number) => 1 - Math.pow(2, -k / 12);
  const px = (k: number) => OZ + ((sc(k) - sc(a)) / (sc(b) - sc(a))) * (VW - OZ - R); // case réelle : l'écart diminue vers l'aigu
  const X = (x: number) => (leftHanded ? VW - x : x);
  const rx = (x: number, w: number) => (leftHanded ? VW - x - w : x);
  const ys = (s: number) => pad + (n - 1 - s) * gap;
  const mx = (f: number) => (f === 0 ? OZ / 2 : px(f - 1) + (px(f) - px(f - 1)) * 0.46);
  const mid = (f: number) => (px(f - 1) + px(f)) / 2;
  const visible = (f: number) => f > a && f <= b;
  const thick = (s: number) => 2.4 + (n > 1 ? (1 - s / (n - 1)) : 0) * 3.8;

  const frets: number[] = []; for (let k = a + 1; k <= b; k++) frets.push(k);
  const cells: { s: number; f: number }[] = [];
  for (let s = 0; s < n; s++) for (let f = from; f <= to; f++) cells.push({ s, f });
  const drawn = cells.filter(({ s, f }) => marks?.get(`${s}:${f}`));
  const lives = live == null ? [] : cells.filter(({ s, f }) => tuning[s] + f === live);

  return (
    <div tabIndex={0} role="group" aria-label="Manche (défile horizontalement)" style="width:100%;overflow-x:auto;border-radius:12px;background:#151515">
      <svg viewBox={`0 0 ${VW} ${H + 38}`} style={`display:block;width:100%;min-width:${Math.round(VW * 0.8)}px;height:auto`} role="img" aria-label="Manche de basse" font-family="Inter, system-ui, sans-serif">
        <defs>
          <linearGradient id={id + 'w'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2E1C14" /><stop offset=".45" stop-color="#35221A" /><stop offset="1" stop-color="#2B1A12" /></linearGradient>
          <linearGradient id={id + 'l'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffecd2" stop-opacity=".08" /><stop offset=".3" stop-color="#000" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity=".36" /></linearGradient>
          <filter id={id + 'g'} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.24" numOctaves="2" seed="7" /><feColorMatrix type="matrix" values="0 0 0 0 0.04  0 0 0 0 0.015  0 0 0 0 0.005  0 0 0 0.6 -0.14" /></filter>
          <linearGradient id={id + 'f'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#807b72" /><stop offset=".38" stop-color="#ebe7dd" /><stop offset=".66" stop-color="#c2bdb2" /><stop offset="1" stop-color="#6c6860" /></linearGradient>
          <linearGradient id={id + 'n'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfc6ae" /><stop offset=".45" stop-color="#f4eddb" /><stop offset="1" stop-color="#c3b99f" /></linearGradient>
          <radialGradient id={id + 'p'} cx=".34" cy=".28" r=".8"><stop offset="0" stop-color="#fffaf0" /><stop offset=".58" stop-color="#ddd4bd" /><stop offset="1" stop-color="#a89f88" /></radialGradient>
          <pattern id={id + 'r'} width="3" height="8" patternUnits="userSpaceOnUse"><rect width="1.5" height="8" fill="#d9d4c9" /><rect x="1.5" width="1.5" height="8" fill="#8c877d" /></pattern>
          <linearGradient id={id + 's'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7" /><stop offset=".45" stop-color="#fff" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity=".45" /></linearGradient>
          <filter id={id + 'd'} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity=".7" /></filter>
          <filter id={id + 'c'} x="-5%" y="-100%" width="110%" height="300%"><feDropShadow dx="0" dy="2.5" stdDeviation="1.4" flood-color="#000" flood-opacity=".6" /></filter>
          <filter id={id + 'h'} x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#ECE8E1" flood-opacity=".6" /></filter>
        </defs>

        {/* tête (zone des cordes à vide) et touche */}
        {OZ > 0 && <rect x={rx(0, OZ)} y="0" width={OZ} height={H} fill="#241710" />}
        <rect x={rx(OZ, VW - OZ)} y="0" width={VW - OZ} height={H} fill={`url(#${id}w)`} />
        <rect x={rx(OZ, VW - OZ)} y="0" width={VW - OZ} height={H} filter={`url(#${id}g)`} opacity=".9" />
        <rect x={rx(OZ, VW - OZ)} y="0" width={VW - OZ} height={H} fill={`url(#${id}l)`} />
        <rect x="0" y={H} width={VW} height="9" fill="#000" opacity=".28" />

        {/* repères latéraux et nacrés */}
        {INLAY_SINGLE.filter(visible).map(f => <circle cx={X(mid(f))} cy="9" r="3" fill={`url(#${id}p)`} />)}
        {INLAY_DOUBLE.filter(visible).map(f => <g><circle cx={X(mid(f) - 5)} cy="9" r="3" fill={`url(#${id}p)`} /><circle cx={X(mid(f) + 5)} cy="9" r="3" fill={`url(#${id}p)`} /></g>)}
        {INLAY_SINGLE.filter(visible).map(f => <circle cx={X(mid(f))} cy={H / 2} r="11" fill={`url(#${id}p)`} filter={`url(#${id}d)`} />)}
        {INLAY_DOUBLE.filter(visible).flatMap(f => [H / 2 - (gap * (n - 1)) / 3, H / 2 + (gap * (n - 1)) / 3].map(y => <circle cx={X(mid(f))} cy={y} r="11" fill={`url(#${id}p)`} filter={`url(#${id}d)`} />))}

        {/* sillet en os + frettes en nickel */}
        {from === 0 && <rect x={rx(OZ - 4, 9)} y="0" width="9" height={H} fill={`url(#${id}n)`} filter={`url(#${id}d)`} />}
        {frets.map(k => <rect x={rx(px(k) - 2, 4)} y="0" width="4" height={H} fill={`url(#${id}f)`} filter={`url(#${id}c)`} />)}

        {/* numéros de cases */}
        {NUMBERED.filter(visible).map(f => <text x={X(mid(f))} y={H + 25} text-anchor="middle" font-size="13" font-family="IBM Plex Mono, monospace" style="fill:#A39E95">{f}</text>)}

        {/* cordes filées */}
        {tuning.map((_, s) => <g filter={`url(#${id}d)`}>
          <rect x="0" y={ys(s) - thick(s) / 2} width={VW} height={thick(s)} rx={thick(s) / 2} fill={`url(#${id}r)`} />
          <rect x="0" y={ys(s) - thick(s) / 2} width={VW} height={thick(s)} rx={thick(s) / 2} fill={`url(#${id}s)`} />
        </g>)}

        {/* note jouée en direct */}
        {lives.map(({ s, f }) => <circle cx={X(mx(f))} cy={ys(s)} r="27" fill="none" stroke="#ECE8E1" stroke-width="2.5" filter={`url(#${id}h)`} />)}

        {/* notes */}
        {drawn.map(({ s, f }) => { const m = marks!.get(`${s}:${f}`)!, cx = X(mx(f)), cy = ys(s), role = m.role;
          return <g filter={`url(#${id}d)`} style="pointer-events:none"><Shape role={role} cx={cx} cy={cy} />
            <circle cx={cx - 5} cy={cy - 6} r="6" fill="#fff" opacity=".28" />
            {m.label && <text x={cx} y={labelY(role, cy)} dy=".35em" text-anchor="middle" font-size={role === 'seventh' || role === 'plain' || role === 'extension' ? 12 : 14} font-weight="700" style={`fill:${role === 'avoid' ? '#E07B6F' : INK}`}>{m.label}</text>}
          </g>; })}

        {/* zones tactiles */}
        {onTap && cells.map(({ s, f }) => <rect x={X(mx(f)) - 30} y={ys(s) - gap / 2} width="60" height={gap} fill="transparent" style="cursor:pointer" onClick={() => onTap(s, f)} />)}
      </svg>
    </div>
  );
}
