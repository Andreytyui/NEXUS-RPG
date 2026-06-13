/* ════════════════════════════════════════════════════════════════════════
 *  ORDEM PARANORMAL — VITAL SIGN (EKG bar)
 *  Continuous heartbeat line whose rhythm reflects the agent's condition:
 *  normal → irregular → erratic → flatline. +/- controls, editable current
 *  (and max in edit mode), value-driven gradient fill.
 *  Requires keyframes from ordemStyles.jsx.
 *
 *  Props: label · abbr · value · max · color · state · fill · onVal · onMax · edit · badge
 * ════════════════════════════════════════════════════════════════════════ */

import { useState } from "react";

/* EKG waveform per state, sampled across a 0..240 × 0..22 viewport. */
const WAVE = {
  normal: "0,11 26,11 32,11 36,3 40,19 44,11 58,11 92,11 98,2 102,20 106,11 150,11 184,11 190,3 194,19 198,11 240,11",
  warn:   "0,11 18,11 22,6 26,16 30,11 52,11 70,11 74,4 78,18 82,11 104,11 128,11 132,6 136,16 140,11 168,11 200,11 204,5 208,17 212,11 240,11",
  crit:   "0,11 12,11 16,2 20,21 24,7 28,18 32,4 36,11 60,11 66,1 70,22 74,5 78,19 82,9 86,11 120,11 126,3 130,20 134,6 138,17 142,11 176,11 182,2 186,21 190,8 194,16 198,11 240,11",
  flat:   "0,11 240,11",
};
const DURATION = { normal: "2.6s", warn: "1.7s", crit: "0.9s", flat: "2s" };

export default function VitalSign({ label, abbr, value, max, color, state = "normal", fill, onVal, onMax, edit, badge }) {
  const [editVal, setEditVal] = useState(false);
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const flat = state === "flat";
  const fillColor = fill || color;

  return (
    <div className={`op-vital ${flat ? "op-flatband" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="op-label" style={{ color, display: "flex", alignItems: "center", gap: 6 }}>
          {label}
          {badge && <span className="op-badge-crit">{badge}</span>}
        </span>
        <span className="op-data" style={{ fontSize: 13, color, display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => onVal(Math.max(0, value - 1))} aria-label={`-1 ${abbr}`}
            style={{ background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 2px" }}>−</button>
          {editVal ? (
            <input autoFocus type="number" defaultValue={value}
              onBlur={(e) => { onVal(Math.max(0, Math.min(max, parseInt(e.target.value, 10) || 0))); setEditVal(false); }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              style={{ width: 40, textAlign: "right", background: "rgba(0,0,0,0.9)", border: "1px solid var(--border2)", color, padding: "1px 3px", fontFamily: "inherit" }} />
          ) : (
            <strong onClick={() => setEditVal(true)} style={{ cursor: "pointer", minWidth: 22, textAlign: "right" }}>{value}</strong>
          )}
          <span style={{ opacity: 0.5 }}>/</span>
          {edit ? (
            <input type="number" defaultValue={max}
              onBlur={(e) => onMax(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: 40, background: "rgba(0,0,0,0.9)", border: "1px solid var(--border2)", color: "var(--muted2)", padding: "1px 3px", fontFamily: "inherit" }} />
          ) : (
            <span style={{ opacity: 0.7 }}>{max}</span>
          )}
          <button onClick={() => onVal(Math.min(max, value + 1))} aria-label={`+1 ${abbr}`}
            style={{ background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 2px" }}>+</button>
        </span>
      </div>
      <div style={{ position: "relative", height: 22, background: "rgba(0,0,0,0.5)", borderRadius: 2, overflow: "hidden", color }}>
        <div style={{ position: "absolute", inset: 0, width: `${pct * 100}%`, background: `linear-gradient(90deg, ${fillColor}22, ${fillColor}66)`, transition: "width 0.4s ease, background 0.4s ease" }} />
        <svg viewBox="0 0 240 22" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <polyline className={`op-ekg-line ${flat ? "" : "op-ekg-sweep"}`}
            style={{ stroke: color, animationDuration: DURATION[state] }}
            points={WAVE[state] || WAVE.normal} />
        </svg>
      </div>
    </div>
  );
}
