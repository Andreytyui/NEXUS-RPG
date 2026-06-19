/* ════════════════════════════════════════════════════════════════════════
 *  ORDEM PARANORMAL — VITAL SIGN (EKG bar) v3
 *  Redesigned: 2-row layout — header (label + value) + bar row (controls).
 *  Props: label · abbr · value · max · color · state · fill · onVal · onMax · edit · badge
 * ════════════════════════════════════════════════════════════════════════ */

import { useState } from "react";

const WAVE = {
  normal: "0,11 26,11 32,11 36,3 40,19 44,11 58,11 92,11 98,2 102,20 106,11 150,11 184,11 190,3 194,19 198,11 240,11",
  warn:   "0,11 18,11 22,6 26,16 30,11 52,11 70,11 74,4 78,18 82,11 104,11 128,11 132,6 136,16 140,11 168,11 200,11 204,5 208,17 212,11 240,11",
  crit:   "0,11 12,11 16,2 20,21 24,7 28,18 32,4 36,11 60,11 66,1 70,22 74,5 78,19 82,9 86,11 120,11 126,3 130,20 134,6 138,17 142,11 176,11 182,2 186,21 190,8 194,16 198,11 240,11",
  flat:   "0,11 240,11",
};
const DURATION = { normal: "2.6s", warn: "1.7s", crit: "0.9s", flat: "2s" };

export default function VitalSign({ label, abbr, value, max, color, state = "normal", fill, onVal, onMax, edit, badge }) {
  const [editVal, setEditVal] = useState(false);
  const [dmgInput, setDmgInput] = useState("");
  const [dmgMode, setDmgMode] = useState("dmg");
  const [showQuick, setShowQuick] = useState(false);

  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const flat = state === "flat";
  const fillColor = fill || color;

  const ctrlBtn = (label, onClick, title) => (
    <button onClick={onClick} title={title}
      style={{
        background: "rgba(0,0,0,0.4)", border: `1px solid ${color}30`,
        color: "var(--muted2)", cursor: "pointer", fontSize: 11,
        lineHeight: 1, padding: "0 6px", height: 26, borderRadius: 3,
        fontFamily: "var(--font-data,'Share Tech Mono',monospace)",
        transition: "background 0.15s, color 0.15s", flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}25`; e.currentTarget.style.color = color; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.4)"; e.currentTarget.style.color = "var(--muted2)"; }}>
      {label}
    </button>
  );

  const applyDmg = () => {
    const n = parseInt(dmgInput, 10);
    if (!n || n < 0) { setDmgInput(""); return; }
    if (dmgMode === "dmg") onVal(Math.max(0, value - n));
    else onVal(Math.min(max, value + n));
    setDmgInput("");
  };

  return (
    <div className={`op-vital ${flat ? "op-flatband" : ""}`} style={{ display: "flex", flexDirection: "column", gap: 5 }}>

      {/* ── Row 1: label + badge + value ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="op-label" style={{ color, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
          {abbr}
        </span>
        {badge && (
          <span style={{
            fontFamily: "var(--font-title,'Cinzel',serif)", fontSize: 8, letterSpacing: "0.12em",
            padding: "2px 7px", borderRadius: 2, background: "rgba(220,50,50,0.2)",
            border: "1px solid rgba(220,50,50,0.5)", color: "#ff6b6b", flexShrink: 0,
          }}>{badge}</span>
        )}
        <span style={{ flex: 1, fontFamily: "var(--font-title,'Cinzel',serif)", fontSize: 9, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        {/* Value display */}
        <span style={{ display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0 }}>
          {editVal ? (
            <input autoFocus type="number" defaultValue={value}
              onBlur={(e) => { onVal(Math.max(0, Math.min(max, parseInt(e.target.value, 10) || 0))); setEditVal(false); }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              style={{ width: 38, textAlign: "center", background: "rgba(0,0,0,0.9)", border: `1px solid ${color}60`, color, padding: "1px 3px", fontFamily: "var(--font-data,'Share Tech Mono',monospace)", fontSize: 14 }} />
          ) : (
            <strong onClick={() => setEditVal(true)} title="Clique para editar"
              style={{ fontFamily: "var(--font-data,'Share Tech Mono',monospace)", fontSize: 18, color, cursor: "pointer", lineHeight: 1, minWidth: 24, textAlign: "right", textShadow: `0 0 10px ${color}60` }}>
              {value}
            </strong>
          )}
          <span style={{ color: "var(--muted)", fontSize: 12, opacity: 0.5 }}>/</span>
          {edit ? (
            <input type="number" defaultValue={max}
              onBlur={(e) => onMax(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: 36, background: "rgba(0,0,0,0.9)", border: "1px solid var(--border2)", color: "var(--muted2)", padding: "1px 3px", fontFamily: "var(--font-data,'Share Tech Mono',monospace)", fontSize: 12, textAlign: "center" }} />
          ) : (
            <span style={{ fontFamily: "var(--font-data,'Share Tech Mono',monospace)", fontSize: 13, color: "var(--muted2)", opacity: 0.7 }}>{max}</span>
          )}
        </span>
      </div>

      {/* ── Row 2: [−5][−1] EKG BAR [+1][+5] [⚡] ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {ctrlBtn("−5", () => onVal(Math.max(0, value - 5)), `-5 ${abbr}`)}
        {ctrlBtn("−", () => onVal(Math.max(0, value - 1)), `-1 ${abbr}`)}

        {/* EKG bar — flex: 1 */}
        <div style={{ position: "relative", flex: 1, height: 26, background: "rgba(0,0,0,0.5)", borderRadius: 3, overflow: "hidden", color }}>
          <div style={{ position: "absolute", inset: 0, width: `${pct * 100}%`, background: `linear-gradient(90deg, ${fillColor}18, ${fillColor}55)`, transition: "width 0.4s ease" }} />
          <svg viewBox="0 0 240 22" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <polyline className={`op-ekg-line ${flat ? "" : "op-ekg-sweep"}`}
              style={{ stroke: color, animationDuration: DURATION[state] }}
              points={WAVE[state] || WAVE.normal} />
          </svg>
        </div>

        {ctrlBtn("+", () => onVal(Math.min(max, value + 1)), `+1 ${abbr}`)}
        {ctrlBtn("+5", () => onVal(Math.min(max, value + 5)), `+5 ${abbr}`)}

        {/* Damage tracker toggle */}
        <button onClick={() => setShowQuick(v => !v)} title="Dano / Cura rápido" aria-label="Tracker de dano"
          style={{
            width: 26, height: 26, borderRadius: 3, flexShrink: 0, cursor: "pointer",
            background: showQuick ? `${color}25` : "rgba(0,0,0,0.4)",
            border: `1px solid ${showQuick ? color : color + "30"}`,
            color: showQuick ? color : "var(--muted2)", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>⚡</button>
      </div>

      {/* ── Quick damage/heal panel ── */}
      {showQuick && (
        <div className="op-vital-quick" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 8px", background: "rgba(0,0,0,0.4)", borderRadius: 4, border: `1px solid ${color}25` }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", borderRadius: 3, overflow: "hidden", border: `1px solid ${color}30`, flexShrink: 0 }}>
            {[["dmg", "DMG"], ["heal", "CURA"]].map(([m, lbl]) => (
              <button key={m} onClick={() => setDmgMode(m)}
                style={{ padding: "3px 9px", fontSize: 9, fontFamily: "var(--font-title,'Cinzel',serif)", letterSpacing: "0.08em", cursor: "pointer", border: "none",
                  background: dmgMode === m ? `${color}35` : "transparent",
                  color: dmgMode === m ? color : "var(--muted2)", transition: "background 0.15s" }}>
                {lbl}
              </button>
            ))}
          </div>

          <input type="number" min={0} value={dmgInput} onChange={e => setDmgInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applyDmg()}
            placeholder="qtd" autoFocus
            style={{ width: 48, padding: "3px 6px", fontSize: 13, background: "rgba(0,0,0,0.7)", border: `1px solid ${color}50`, color, borderRadius: 3, fontFamily: "var(--font-data,'Share Tech Mono',monospace)", textAlign: "center" }} />

          <button onClick={applyDmg}
            style={{ padding: "3px 12px", borderRadius: 3, border: `1px solid ${color}50`, background: `${color}18`, color, fontSize: 10, fontFamily: "var(--font-title,'Cinzel',serif)", letterSpacing: "0.06em", cursor: "pointer" }}>
            {dmgMode === "dmg" ? "Aplicar" : "Curar"}
          </button>

          <button onClick={() => { onVal(max); setShowQuick(false); }} title="Recuperar tudo"
            style={{ marginLeft: "auto", padding: "3px 8px", borderRadius: 3, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.07)", color: "#4ade80", fontSize: 9, fontFamily: "var(--font-title,'Cinzel',serif)", letterSpacing: "0.06em", cursor: "pointer" }}>
            MAX
          </button>
        </div>
      )}
    </div>
  );
}
