/* ════════════════════════════════════════════════════════════════════════
 *  ORDEM PARANORMAL — ATTRIBUTE PENTAGON
 *  The original sigil aesthetic: five runic attribute nodes arranged in a
 *  pentagon around a glowing golden "ATRIBUTOS · ORDEM PARANORMAL" core.
 *  Click a node to roll; in edit mode click the number to type or use ±.
 *  Element affinity subtly tints the node glow on hover.
 *
 *  Props: attrs · onRoll(key) · onEdit(key,val)|null · onChange(key,delta)|null · glow
 * ════════════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";

export default function AttrPentagon({ attrs, onRoll, onEdit, onChange, glow = "#e8c96d" }) {
  const [editing, setEditing] = useState(null);
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const positions = {
    AGI: { x: 160, y: 30 }, FOR: { x: 50, y: 145 }, INT: { x: 270, y: 145 },
    PRE: { x: 90, y: 260 }, VIG: { x: 230, y: 260 },
  };
  const center = { x: 160, y: 178 };
  const LABELS = { AGI: "AGILIDADE", FOR: "FORÇA", INT: "INTELECTO", PRE: "PRESENÇA", VIG: "VIGOR" };
  const pentOrder = ["AGI", "INT", "VIG", "PRE", "FOR"];
  const RUNES = "ᚠᚢᚦᚨᚱ·ᚲᚷᚹᚺᚾ·ᛁᛃᛇᛈᛉ·ᛊᛏᛒᛖᛗ·ᛚᛜᛞᛟ·";
  const circPath = (cx, cy, r) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0`;

  const startEdit = (key) => { setEditing(key); setInputVal(String(attrs[key])); };
  const commitEdit = () => {
    if (!editing) return;
    const parsed = parseInt(inputVal, 10);
    const newVal = isNaN(parsed) ? attrs[editing] : Math.max(0, Math.min(99, parsed));
    onEdit?.(editing, newVal);
    setEditing(null);
  };

  return (
    <svg viewBox="-10 -28 340 390" style={{ display: "block", width: "100%", height: "auto", overflow: "visible", "--pent-glow": glow }}>
      <defs>
        <radialGradient id="op-cg-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5e07a" stopOpacity="1" />
          <stop offset="55%" stopColor="#c9a84c" stopOpacity="1" />
          <stop offset="100%" stopColor="#7a5c18" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="op-cg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
        </radialGradient>
        <filter id="op-ag2"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="op-glow-soft"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        {Object.entries(positions).map(([k, p]) => (
          <path key={k} id={`op-rp-${k}`} d={circPath(p.x, p.y, 47)} fill="none" />
        ))}
        <path id="op-rp-center" d={circPath(center.x, center.y, 59)} fill="none" />
      </defs>

      <style>{`
        @keyframes op-sigil-pulse{
          0%,55%,100%{ fill:rgba(201,168,76,0.60); filter:none; }
          60%{ fill:rgba(255,235,90,1); filter:drop-shadow(0 0 7px rgba(255,210,60,1)) drop-shadow(0 0 14px rgba(201,168,76,0.7)); }
          72%{ fill:rgba(255,215,65,0.85); filter:drop-shadow(0 0 4px rgba(255,190,40,0.6)); }
          88%{ fill:rgba(201,168,76,0.65); filter:none; }
        }
        .op-sigil-ring{ animation:op-sigil-pulse 8s ease-in-out infinite; }
        @keyframes op-sigil-center-pulse{
          0%,60%,100%{ fill:rgba(30,18,4,0.65); }
          65%{ fill:rgba(80,45,5,1); filter:drop-shadow(0 0 5px rgba(180,120,20,0.6)); }
          80%{ fill:rgba(30,18,4,0.65); filter:none; }
        }
        .op-sigil-center{ animation:op-sigil-center-pulse 10s ease-in-out infinite; }
        .op-pent-node .op-pent-core{ transition:filter 0.2s ease; }
        .op-pent-node:hover .op-pent-core{ filter:drop-shadow(0 0 7px var(--pent-glow)); }
        .op-pent-num{ transition:transform 0.18s ease; transform-box:fill-box; transform-origin:center; }
        .op-pent-node:hover .op-pent-num{ transform:scale(1.08); }
      `}</style>

      {/* pentagon outline */}
      <polygon points={pentOrder.map((k) => `${positions[k].x},${positions[k].y}`).join(" ")} fill="none" stroke="rgba(201,168,76,0.28)" strokeWidth="1.2" />

      {/* radial spokes */}
      {Object.entries(positions).map(([k, p]) => (
        <line key={k} x1={center.x} y1={center.y} x2={p.x} y2={p.y} stroke="rgba(201,168,76,0.32)" strokeWidth="1.2" />
      ))}

      {/* central golden sigil */}
      <circle cx={center.x} cy={center.y} r="66" fill="url(#op-cg-glow)" />
      <circle cx={center.x} cy={center.y} r="52" fill="url(#op-cg-center)" stroke="rgba(201,168,76,0.9)" strokeWidth="1.5" filter="url(#op-glow-soft)" />
      <circle cx={center.x} cy={center.y} r="49" fill="none" stroke="rgba(255,240,160,0.35)" strokeWidth="0.75" />
      <text fontSize="10" className="op-sigil-center" letterSpacing="2.5"><textPath href="#op-rp-center">{RUNES.repeat(3)}</textPath></text>
      <text x={center.x} y={center.y - 5} textAnchor="middle" fontFamily="Cinzel,serif" fontSize="11" fill="#1a1004" letterSpacing="2" fontWeight="700">ATRIBUTOS</text>
      <text x={center.x} y={center.y + 10} textAnchor="middle" fontFamily="Cinzel,serif" fontSize="7" fill="#3a2808" letterSpacing="1">ORDEM PARANORMAL</text>
      <text x={center.x} y={center.y + 22} textAnchor="middle" fontFamily="Cinzel,serif" fontSize="6.5" fill="#3a2808">Clique p/ rolar</text>

      {/* attribute nodes */}
      {Object.entries(positions).map(([key, p], i) => {
        const val = attrs[key];
        const isEditing = editing === key;
        return (
          <g key={key} className="op-pent-node">
            <circle cx={p.x} cy={p.y} r="56" fill="none" stroke="rgba(201,168,76,0.20)" strokeWidth="0.75" />
            <text fontSize="10" className="op-sigil-ring" style={{ animationDelay: `${i * 1.6}s` }} letterSpacing="2.5">
              <textPath href={`#op-rp-${key}`}>{RUNES.repeat(2)}</textPath>
            </text>
            <circle cx={p.x} cy={p.y} r="36" fill="none" stroke="rgba(201,168,76,0.30)" strokeWidth="0.75" strokeDasharray="1.5,3.5" />
            <circle className="op-pent-core" cx={p.x} cy={p.y} r="33" fill="rgba(5,5,8,0.97)"
              stroke={isEditing ? "rgba(201,168,76,0.9)" : "rgba(201,168,76,0.6)"} strokeWidth={isEditing ? "2" : "1.5"} filter="url(#op-ag2)"
              style={{ cursor: !isEditing ? "pointer" : "default" }} onClick={() => !isEditing && onRoll?.(key)} />
            <circle cx={p.x} cy={p.y} r="27" fill="#060608" stroke="rgba(201,168,76,0.2)" strokeWidth="1"
              style={{ cursor: !isEditing ? "pointer" : "default" }} onClick={() => !isEditing && onRoll?.(key)} />

            {isEditing ? (
              <foreignObject x={p.x - 21} y={p.y - 19} width="42" height="26">
                <input ref={inputRef} type="number" min="0" max="99" value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)} onBlur={commitEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                  style={{ width: "100%", height: "100%", textAlign: "center", background: "rgba(0,0,0,0.95)", border: "1px solid rgba(201,168,76,0.85)", color: glow, fontFamily: "'Cinzel Decorative',serif", fontSize: "15px", fontWeight: "700", borderRadius: "3px", padding: 0, boxSizing: "border-box", MozAppearance: "textfield" }} />
              </foreignObject>
            ) : (
              <>
                <text className="op-pent-num" x={p.x} y={p.y - 2} textAnchor="middle" fontFamily="Cinzel Decorative,serif" fontSize="20" fill={glow} fontWeight="700"
                  style={{ cursor: onEdit ? "text" : "pointer", filter: `drop-shadow(0 0 4px ${glow}aa)` }}
                  onClick={(e) => { e.stopPropagation(); onEdit ? startEdit(key) : onRoll?.(key); }}>
                  {val}
                </text>
                {onEdit && <line x1={p.x - 11} y1={p.y + 7} x2={p.x + 11} y2={p.y + 7} stroke="rgba(201,168,76,0.75)" strokeWidth="1.5" strokeLinecap="round" />}
              </>
            )}

            <text x={p.x} y={p.y + 11} textAnchor="middle" fontFamily="Cinzel,serif" fontSize="6.5" fill="#b0a07a" letterSpacing="1"
              style={{ cursor: !isEditing ? "pointer" : "default" }} onClick={() => !isEditing && onRoll?.(key)}>{LABELS[key]}</text>
            <text x={p.x} y={p.y + 21} textAnchor="middle" fontFamily="Cinzel,serif" fontSize="10" fill="#c9a84c" fontWeight="600"
              style={{ cursor: !isEditing ? "pointer" : "default" }} onClick={() => !isEditing && onRoll?.(key)}>{key}</text>

            {onChange && (
              <>
                <rect x={p.x - 27} y={p.y + 24} width="18" height="12" rx="3" fill="rgba(201,168,76,0.1)" stroke="rgba(201,168,76,0.3)" strokeWidth="1" style={{ cursor: "pointer" }} onClick={() => onChange(key, -1)} />
                <text x={p.x - 18} y={p.y + 33} textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c9a84c" style={{ cursor: "pointer" }} onClick={() => onChange(key, -1)}>−</text>
                <rect x={p.x + 9} y={p.y + 24} width="18" height="12" rx="3" fill="rgba(201,168,76,0.1)" stroke="rgba(201,168,76,0.3)" strokeWidth="1" style={{ cursor: "pointer" }} onClick={() => onChange(key, 1)} />
                <text x={p.x + 18} y={p.y + 33} textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#c9a84c" style={{ cursor: "pointer" }} onClick={() => onChange(key, 1)}>+</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
