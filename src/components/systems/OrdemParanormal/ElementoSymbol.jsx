/* ════════════════════════════════════════════════════════════════════════
 *  ORDEM PARANORMAL — ELEMENT SYMBOLS (canonical Outro Lado glyphs)
 *  Morte spirals · Sangue cross+squares+waves · Conhecimento triangle+runes ·
 *  Medo asymmetric glyph · Energia rotated diamond. Pure SVG/CSS, animated.
 *  Props: id · size · animated · color (override)
 * ════════════════════════════════════════════════════════════════════════ */

import { getElementTheme } from "./elementos";

const spiralPath = (cx, cy, turns, maxR, offset = 0) => {
  let d = "";
  const steps = turns * 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * turns * 2 * Math.PI + offset;
    const r = t * maxR;
    const x = (cx + Math.cos(ang) * r).toFixed(1);
    const y = (cy + Math.sin(ang) * r).toFixed(1);
    d += `${i === 0 ? "M" : "L"} ${x} ${y} `;
  }
  return d;
};

const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗ";

export default function ElementoSymbol({ id, size = 40, animated = true, color }) {
  const t = getElementTheme(id);
  const c = color || t.accent || "#c9a84c";
  const a = animated;
  const box = { width: size, height: size, viewBox: "0 0 64 64", style: { overflow: "visible" }, "aria-hidden": true };

  return (
    <svg {...box}>
      <style>{`
        @keyframes el-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes el-spin-rev{from{transform:rotate(0)}to{transform:rotate(-360deg)}}
        @keyframes el-pulse{0%,100%{opacity:.55}50%{opacity:1}}
        @keyframes el-flicker{0%,100%{opacity:.85}48%{opacity:1}50%{opacity:.3}52%{opacity:.9}}
        @keyframes el-arc{0%,100%{opacity:.25}50%{opacity:1}}
        .el-rot{transform-origin:32px 32px}
      `}</style>

      {id === "morte" && (
        <g stroke={c} fill="none" strokeWidth="1.4" strokeLinecap="round">
          <path className="el-rot" style={a ? { animation: "el-spin 22s linear infinite" } : undefined} d={spiralPath(32, 32, 3, 26)} opacity="0.9" />
          <path className="el-rot" style={a ? { animation: "el-spin-rev 30s linear infinite" } : undefined} d={spiralPath(32, 32, 3, 20, Math.PI)} opacity="0.5" />
          <circle cx="32" cy="32" r="2.2" fill={c} stroke="none" />
        </g>
      )}

      {id === "sangue" && (
        <g stroke={c} fill="none" strokeWidth="2" style={a ? { animation: "el-pulse 2.6s ease-in-out infinite" } : undefined}>
          <line x1="32" y1="8" x2="32" y2="56" />
          <line x1="14" y1="34" x2="50" y2="34" />
          <rect x="9" y="9" width="9" height="9" />
          <rect x="46" y="9" width="9" height="9" />
          <rect x="9" y="46" width="9" height="9" />
          <rect x="46" y="46" width="9" height="9" />
          <path strokeWidth="1" d="M20 24 q4 -4 8 0 t8 0 t8 0" />
          <path strokeWidth="1" d="M20 44 q4 4 8 0 t8 0 t8 0" />
        </g>
      )}

      {id === "conhecimento" && (
        <g fill="none" stroke={c} strokeWidth="1.4">
          <circle cx="32" cy="32" r="27" opacity="0.85" style={a ? { animation: "el-pulse 4s ease-in-out infinite" } : undefined} />
          <circle cx="32" cy="32" r="22" opacity="0.4" />
          <polygon points="32,12 51,46 13,46" />
          <circle cx="32" cy="34" r="6" opacity="0.7" />
          <defs><path id={`el-ringpath-${size}`} d="M32 32 m-24 0 a24 24 0 1 1 48 0 a24 24 0 1 1 -48 0" /></defs>
          <text fontSize="6.5" fill={c} stroke="none" letterSpacing="2" className="el-rot" style={a ? { animation: "el-spin 40s linear infinite" } : undefined}>
            <textPath href={`#el-ringpath-${size}`}>{RUNES}</textPath>
          </text>
        </g>
      )}

      {id === "medo" && (
        <g stroke={c} fill="none" strokeWidth="1.6" strokeLinecap="round" style={a ? { animation: "el-flicker 3.2s steps(1) infinite" } : undefined}>
          <path d="M32 7 L41 22 L33 30 L46 33 L37 44 L44 57" />
          <path d="M32 7 L23 20 L31 29 L18 33 L28 43 L20 57" opacity="0.7" />
          <path d="M22 33 L42 33" opacity="0.5" />
          <circle cx="32" cy="33" r="3" fill={c} stroke="none" opacity="0.8" />
        </g>
      )}

      {id === "energia" && (
        <g stroke={c} fill="none" strokeWidth="1.6">
          <rect x="14" y="14" width="36" height="36" transform="rotate(45 32 32)" style={a ? { animation: "el-pulse 2.2s ease-in-out infinite" } : undefined} />
          <rect x="22" y="22" width="20" height="20" transform="rotate(45 32 32)" opacity="0.5" />
          <line x1="32" y1="6" x2="32" y2="58" opacity="0.7" />
          <line x1="6" y1="32" x2="58" y2="32" opacity="0.7" />
          <path strokeWidth="1.2" style={a ? { animation: "el-arc 1.4s ease-in-out infinite" } : undefined} d="M32 8 l5 9 l-7 4 l6 8" opacity="0.8" />
        </g>
      )}

      {!["morte", "sangue", "conhecimento", "medo", "energia"].includes(id) && (
        <g stroke={c} fill="none" strokeWidth="1.5"><circle cx="32" cy="32" r="22" /><circle cx="32" cy="32" r="5" fill={c} /></g>
      )}
    </svg>
  );
}
