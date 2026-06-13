/* ════════════════════════════════════════════════════════════════════════
 *  ORDEM PARANORMAL — FIELD DOSSIER SHEET (v2)
 *  Full agent dossier: runic attribute dials, EKG vital signs with
 *  critical/breach states, Elemento de Afinidade system + per-element
 *  theming, complete tab set, edit mode with debounced Firestore save,
 *  dice overlay + history, and keyboard shortcuts.
 *
 *  Drop-in for the legacy FullSheet — same props ({ character, onBack,
 *  onUpdate, onRoll }) and same persisted shape (Firestore is schemaless,
 *  so the new fields persist automatically — the brief's SQL is N/A).
 * ════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import AttrConstellation from "./AttrConstellation";
import VitalSign from "./VitalSign";
import { OrdemSheetStyles } from "./ordemStyles";
import { getElementTheme, ELEMENT_UNLOCK_NEX } from "./elementos";
import ElementoSymbol from "./ElementoSymbol";
import ElementoAfinidadeModal from "./ElementoAfinidadeModal";
import {
  ATTR_KEYS, ATTR_LABELS, PERICIAS, PERICIA_GRUPOS, defaultTrainedSet, treinoColor,
  nexStats, deriveStats, rollOP, rollExpr, nexLevel, NEX_LADDER, rollPayload,
} from "./rules";

const downscale = (file, max = 420) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

/* PV fill shifts green → yellow → red as it drops. */
const pvFill = (pct) => (pct > 0.6 ? "#43a047" : pct > 0.3 ? "#fbc02d" : "#e53935");
const vitalState = (pct, dead) => (dead ? "flat" : pct > 0.6 ? "normal" : pct >= 0.3 ? "warn" : "crit");

/* faint static/whisper while sanity is breached (opt-in) */
function startWhisper() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufLen = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0.012;
    src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start();
    return { ctx, src };
  } catch { return null; }
}
function stopWhisper(w) { if (!w) return; try { w.src.stop(); w.ctx.close(); } catch {} }

export default function OrdemParanormalSheet({ character, onBack, onUpdate, onRoll }) {
  /* ── persisted state ── */
  const [attrs, setAttrs] = useState(character.attrs || { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 });
  const [origem] = useState(character.origem ?? null);
  const [classe] = useState(character.classe ?? null);
  const [form, setForm] = useState(character.form ?? {});
  const [skillTreino, setSkillTreino] = useState(character.skillTreino ?? {});
  const [skillOutros, setSkillOutros] = useState(character.skillOutros ?? {});
  const [skillAttr] = useState(character.skillAttr ?? {});
  const [pdBonus, setPdBonus] = useState(character.pdBonus ?? 0);
  const [nex, setNex] = useState(character.nex ?? 5);

  const cs0 = useMemo(() => nexStats(character.nex ?? 5, classe?.id, character.attrs || attrs), []); // eslint-disable-line
  const [pvMax, setPvMax] = useState(character.pvMax ?? cs0.pv);
  const [sanMax, setSanMax] = useState(character.sanMax ?? cs0.san);
  const [peMax, setPeMax] = useState(character.peMax ?? cs0.pe);
  const [hp, setHp] = useState(character.pv ?? cs0.pv);
  const [san, setSan] = useState(character.san ?? cs0.san);
  const [pe, setPe] = useState(character.pe ?? cs0.pe);

  const [attacks, setAttacks] = useState(character.attacks ?? character.ataques ?? []);
  const [skills, setSkills] = useState(character.skills ?? []);
  const [poderes, setPoderes] = useState(character.poderes ?? []);
  const [rituais, setRituais] = useState(character.rituais ?? []);
  const [itens, setItens] = useState(character.itens ?? []);
  const [diario, setDiario] = useState(character.diario ?? []);
  const [creditos, setCreditos] = useState(character.creditos ?? 0);
  const [rollHistory, setRollHistory] = useState(character.rollHistory ?? []);
  const [trilha] = useState(character.trilha ?? null);

  const [defesaBonus, setDefesaBonus] = useState(character.defesaBonus ?? 0);
  const [esquivaBonus, setEsquivaBonus] = useState(character.esquivaBonus ?? 0);
  const [bloqueio, setBloqueio] = useState(character.bloqueio ?? 0);
  const [protecao, setProtecao] = useState(character.protecao ?? "");
  const [resistencias, setResistencias] = useState(character.resistencias ?? []);
  const [proeficiencia, setProeficiencia] = useState(character.proeficiencia ?? 0);

  const [elementoAfinidade, setElementoAfinidade] = useState(character.elementoAfinidade ?? null);
  const [elementoEscolhidoEm, setElementoEscolhidoEm] = useState(character.elementoEscolhidoEm ?? null);
  const [elementoGmOverride] = useState(character.elementoGmOverride ?? false);
  const [elementoNotas, setElementoNotas] = useState(character.elementoNotas ?? []);

  /* ── UI state ── */
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("combate");
  const [diceInput, setDiceInput] = useState("");
  const [roll, setRoll] = useState(null);
  const [showNex, setShowNex] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showElementModal, setShowElementModal] = useState(false);
  const [transEl, setTransEl] = useState(null);
  const [skillFilter, setSkillFilter] = useState("");
  const [collapsedCats, setCollapsedCats] = useState({});
  const [whisperOn, setWhisperOn] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const portraitInput = useRef(null);
  const diceRef = useRef(null);
  const charName = form.personagem || character.form?.personagem || character.name || "Agente";

  const theme = getElementTheme(elementoAfinidade);
  const trained = useMemo(() => defaultTrainedSet(origem, classe), [origem, classe]);

  /* ── recompute maxima when attributes change ── */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const ns = nexStats(nex, classe?.id, attrs);
    setPvMax(ns.pv); setHp((v) => Math.min(v, ns.pv));
    setSanMax(ns.san); setSan((v) => Math.min(v, ns.san));
    setPeMax(ns.pe); setPe((v) => Math.min(v, ns.pe));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.AGI, attrs.FOR, attrs.INT, attrs.PRE, attrs.VIG]);

  /* ── element unlock at NEX 50% (non-dismissible) ── */
  useEffect(() => {
    if (nex >= ELEMENT_UNLOCK_NEX && !elementoAfinidade) setShowElementModal(true);
  }, [nex, elementoAfinidade]);

  /* ── snapshot + debounced save (latest kept in ref for flush) ── */
  const snapshot = {
    ...character, attrs, form, origem, classe, skillTreino, skillOutros, skillAttr, pdBonus, nex,
    pv: hp, san, pe, pvMax, sanMax, peMax, attacks, ataques: attacks, skills, poderes, rituais, itens,
    diario, creditos, rollHistory, trilha, defesaBonus, esquivaBonus, bloqueio, protecao, resistencias,
    proeficiencia, elementoAfinidade, elementoEscolhidoEm, elementoGmOverride, elementoNotas,
  };
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const dirtyRef = useRef(false);
  const saveTimer = useRef(null);
  const flushSave = () => {
    clearTimeout(saveTimer.current);
    if (dirtyRef.current) { onUpdate?.(latest.current); dirtyRef.current = false; setDirty(false); setSavedAt(Date.now()); }
  };
  const savedOnce = useRef(false);
  useEffect(() => {
    if (!savedOnce.current) { savedOnce.current = true; return; }
    dirtyRef.current = true; setDirty(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate?.(latest.current); dirtyRef.current = false; setDirty(false); setSavedAt(Date.now());
    }, 900);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs, form, skillTreino, skillOutros, pdBonus, nex, hp, san, pe, pvMax, sanMax, peMax, attacks, skills, poderes,
      rituais, itens, diario, creditos, defesaBonus, esquivaBonus, bloqueio, protecao, resistencias,
      proeficiencia, elementoAfinidade, elementoNotas]);
  useEffect(() => () => flushSave(), []); // flush on unmount
  const handleBack = () => { flushSave(); onBack?.(); };

  /* ── derived ── */
  const { peTurno, deslocamento } = deriveStats(attrs, nex);
  const defesa = 10 + (attrs.AGI || 0) + defesaBonus;
  const esquiva = (attrs.AGI || 0) + esquivaBonus;
  const pvPct = pvMax > 0 ? hp / pvMax : 0;
  const sanPct = sanMax > 0 ? san / sanMax : 0;
  const pePct = peMax > 0 ? pe / peMax : 0;
  const wounded = pvPct < 0.3;
  const breach = sanPct < 0.3;
  const pvColor = "#e53935"; // PV is always blood-red
  const sanColor = elementoAfinidade ? theme.accent : "#7b1fa2"; // Determinação follows the element
  const isMedo = elementoAfinidade === "medo";
  const clearance = [...NEX_LADDER].reverse().find((r) => nex >= r.nex)?.tier || "INICIANTE";

  /* ── whisper while breached + opted in ── */
  const whisperRef = useRef(null);
  useEffect(() => {
    if (breach && whisperOn) { whisperRef.current = startWhisper(); }
    return () => { stopWhisper(whisperRef.current); whisperRef.current = null; };
  }, [breach, whisperOn]);

  /* ── dice ── */
  const pushHistory = (entry) => setRollHistory((h) => [{ id: Date.now() + Math.random(), ...entry }, ...h].slice(0, 20));
  const fireRoll = (label, res) => {
    // nova rolagem substitui a anterior (não acumula); crítico → modal central, normal → corner card
    setRoll({ attr: label, ...res, ts: Date.now() });
    onRoll?.(rollPayload(label, { ...res, expr: res.expr || label }, charName));
    pushHistory({ label, rolls: res.rolls, result: res.result, crit: !!res.crit, ts: Date.now() });
  };
  const rollAttr = (k) => fireRoll(ATTR_LABELS[k], rollOP(attrs[k]));
  const rollSkill = (p) => {
    const ak = skillAttr[p.base] || p.attr;
    const base = rollOP(attrs[ak]);
    const tBonus = skillTreino[p.base] ?? (trained.has(p.base) ? 5 : 0);
    const other = Number(skillOutros[p.base] || 0);
    fireRoll(`${p.base} (${ak})`, { ...base, result: base.result + tBonus + other });
  };
  const rollFree = () => {
    const res = rollExpr(diceInput);
    if (!res) { setRoll({ phase: "result", attr: "ERRO", rolls: [], result: "ex: 1d20+3", crit: false }); return; }
    fireRoll(diceInput.toUpperCase(), { ...res, expr: diceInput });
    setDiceInput("");
  };
  const rollAttack = (a) => {
    const atkAttr = a.attr || "FOR"; // teste de ataque (Luta/Pontaria) — usa FOR por padrão
    const atk = rollOP(attrs[atkAttr] || 1);
    const dmg = rollExpr(a.dano || a.damage || "1d6") || { rolls: [0], result: 0, dice: "D6" };
    fireRoll(a.name || "Ataque", { ...atk, kind: "attack", dano: dmg.result, danoRolls: dmg.rolls });
  };

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (showElementModal || transEl) return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); setActiveTab("combate"); setTimeout(() => diceRef.current?.focus(), 30); }
      else if (e.key === "e" || e.key === "E") { setEditMode((v) => !v); }
      else if (["1", "2", "3", "4", "5"].includes(e.key)) { rollAttr(ATTR_KEYS[parseInt(e.key, 10) - 1]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs, showElementModal, transEl]);

  /* ── element choice → eruption transition → persist ── */
  const chooseElement = (id) => {
    setShowElementModal(false);
    setTransEl(id);
    setTimeout(() => {
      setElementoAfinidade(id);
      setElementoEscolhidoEm(Date.now());
      setTransEl(null);
    }, 1500);
  };

  const onPortrait = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const data = await downscale(file);
    setForm((f) => ({ ...f, avatar: data }));
    setShowUpload(false);
  };

  /* ── array helpers ── */
  const upd = (setter) => (i, patch) => setter((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const rm = (setter) => (i) => setter((arr) => arr.filter((_, idx) => idx !== i));
  const add = (setter, blank) => () => setter((arr) => [...arr, { id: Date.now(), ...blank }]);

  const rootVars = {
    "--el-primary": theme.primary, "--el-accent": theme.accent, "--el-glow": theme.accent,
    "--el-rune": theme.primary, "--el-vital": theme.accent, "--el-deep": theme.bg,
    "--el-bg": theme.bg, "--el-border": theme.border,
    "--crisis-vignette": theme.crisis.vignette,
  };

  const TABS = [["combate", "Combate"], ["poderes", "Poderes"], ["skills", "Skills"], ["rituais", "Rituais"], ["itens", "Itens"], ["diario", "Diário"]];
  const totalPeso = itens.reduce((s, it) => s + (Number(it.qtd) || 1) * (Number(it.peso) || 0), 0);
  const filteredPericias = PERICIAS.filter((p) => p.base.toLowerCase().includes(skillFilter.toLowerCase()));

  const inputMini = { padding: "4px 7px", fontSize: 13, width: "100%" };

  const renderSkillRow = (p) => {
    const t = skillTreino[p.base] ?? (trained.has(p.base) ? 5 : 0);
    const isTrained = t > 0;
    const ak = skillAttr[p.base] || p.attr;
    const outros = Number(skillOutros[p.base] || 0);
    const bonus = t + outros;
    return (
      <div key={p.base} className="op-skill">
        <span role="button" tabIndex={0} title="Alternar grau de treino" aria-label={`Treino de ${p.base}`}
          onClick={() => setSkillTreino((s) => ({ ...s, [p.base]: ((s[p.base] ?? (trained.has(p.base) ? 5 : 0)) + 5) % 20 }))}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSkillTreino((s) => ({ ...s, [p.base]: ((s[p.base] ?? (trained.has(p.base) ? 5 : 0)) + 5) % 20 }))}
          style={{ color: treinoColor(t), fontSize: 13, textAlign: "center", cursor: "pointer" }}>{isTrained ? "⬢" : "⬡"}</span>
        <span onClick={() => rollSkill(p)} title={`Rolar ${p.base}`}
          style={{ color: isTrained ? treinoColor(t) : "var(--muted2)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.base}
          {p.onlyTrained && <sup title="Somente treinado" style={{ color: "var(--muted)", cursor: "help" }}>*</sup>}
          {p.needsKit && <sup title="Somente treinado com Bônus" style={{ color: "var(--muted)", cursor: "help" }}>+</sup>}
        </span>
        <span style={{ textAlign: "center", color: "var(--muted)", fontSize: 10 }}>{ak}</span>
        <span style={{ textAlign: "center", color: isTrained ? "var(--el-glow)" : "var(--muted)" }}>({bonus})</span>
        <input type="number" value={t} onClick={(e) => e.stopPropagation()} aria-label={`Treino ${p.base}`}
          onChange={(e) => setSkillTreino((s) => ({ ...s, [p.base]: Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0)) }))}
          style={{ color: treinoColor(t) }} />
        <input type="number" value={outros} onClick={(e) => e.stopPropagation()} aria-label={`Outros ${p.base}`}
          onChange={(e) => setSkillOutros((s) => ({ ...s, [p.base]: parseInt(e.target.value, 10) || 0 }))}
          style={{ color: "var(--muted2)" }} />
        <button className="op-roll-btn" onClick={() => rollSkill(p)} aria-label={`Rolar ${p.base}`}>🎲</button>
      </div>
    );
  };

  return (
    <div className={`op-sheet op-fill op-grain fade ${breach ? "op-breach" : ""}`} style={rootVars} data-elemento={elementoAfinidade || "ordem"}>
      <OrdemSheetStyles />
      <div className={`op-vignette ${wounded ? "on" : ""}`} />
      <div className={`op-outrolado ${breach ? "on" : ""}`} />
      {breach && <div className="op-outrolado-glyphs on">{"ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗ".repeat(120)}</div>}
      {wounded && <div className="op-watermark">{theme.crisis.watermark}</div>}

      {/* ═══ HEADER (sticky) ═══ */}
      <div className={isMedo ? "op-static" : undefined} style={{ position: "sticky", top: 0, zIndex: 5, background: "linear-gradient(180deg, var(--bg) 70%, transparent)", paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button className="btn-ghost" onClick={handleBack} aria-label="Voltar">← Voltar</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="op-label" style={{ marginBottom: 2 }}>Dossiê de Agente · Ordem Paranormal</div>
            <h1 className={`op-glitch ${wounded ? "on" : ""}`}
              style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: "clamp(22px,3.4vw,38px)", color: "var(--el-glow)", lineHeight: 1.05, margin: 0, textShadow: "0 0 18px var(--el-glow)" }}>
              {charName}
            </h1>
          </div>
          {elementoAfinidade && (
            <span title={isMedo && elementoGmOverride ? "Elemento concedido pelo Mestre da Campanha" : theme.name}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", border: `1px solid ${theme.border}`, borderRadius: 4, background: `${theme.accent}1f` }}>
              <ElementoSymbol id={elementoAfinidade} size={18} />
              <span className="op-data" style={{ fontSize: 11, color: theme.accent }}>{theme.name}{isMedo && elementoGmOverride ? " 🔒" : ""}</span>
            </span>
          )}
          <span style={{ fontFamily: "var(--font-title,'Cinzel',serif)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--danger-text,#d85a5a)", border: "2px solid var(--danger,#8b1a1a)", borderRadius: 4, padding: "3px 9px", fontSize: 10, transform: "rotate(-7deg)", boxShadow: "0 0 6px rgba(139,26,26,0.4)" }}>Agente Ativo</span>
          <button onClick={() => setShowShortcuts((v) => !v)} className="btn-ghost" aria-label="Atalhos de teclado" title="Atalhos">?</button>
          <button onClick={() => setEditMode((v) => !v)} aria-pressed={editMode} className="btn-ghost"
            style={editMode ? { background: "var(--gold-dim)", borderColor: "var(--gold)", color: "var(--gold2)" } : undefined}>
            {editMode ? "🔓 Editando" : "🔒 Travado"}
          </button>
        </div>
        {showShortcuts && (
          <div className="op-ink op-data" style={{ marginTop: 8, padding: "8px 12px", fontSize: 11, color: "var(--muted2)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span><b style={{ color: "var(--gold2)" }}>R</b> rolador</span>
            <span><b style={{ color: "var(--gold2)" }}>E</b> modo edição</span>
            <span><b style={{ color: "var(--gold2)" }}>1–5</b> testar AGI/FOR/INT/PRE/VIG</span>
          </div>
        )}
      </div>

      {/* ═══ 3-COLUMN DOSSIER ═══ */}
      <div className="op-sheet-grid" style={{ position: "relative", zIndex: 1 }}>

        {/* ── LEFT ── */}
        <div className="op-col op-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* portrait + identity */}
          <div className="op-ink op-photo-frame" style={{ position: "relative", height: 220, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            role="button" tabIndex={0} aria-label="Retrato do agente" onClick={() => setShowUpload(true)}
            onKeyDown={(e) => e.key === "Enter" && setShowUpload(true)}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 26px ${theme.accent}66`; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}>
            {form.avatar ? (
              <img src={form.avatar} alt={charName} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "sepia(0.42) contrast(1.06) brightness(0.95) saturate(0.85)" }} />
            ) : (
              <div style={{ textAlign: "center", color: "var(--muted)" }}>
                <div style={{ fontSize: 42, opacity: 0.5 }}>◈</div>
                <div className="op-label" style={{ marginTop: 6 }}>Sem Retrato</div>
                <div className="op-data" style={{ fontSize: 10, marginTop: 4, color: "var(--gold)" }}>clique para enviar</div>
              </div>
            )}
            <span style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 38px rgba(0,0,0,0.92)" }} />
          </div>

          {/* identity badges */}
          <div className="op-ink" style={{ padding: "10px 12px", background: "rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", gap: 6 }}>
            <Field label="Jogador" value={form.jogador || character.jogador || "—"} editMode={editMode} onChange={(v) => setForm((f) => ({ ...f, jogador: v }))} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
              <Badge>{origem?.name || "Sem origem"}</Badge>
              <Badge accent>{({ combatente: "⚔️", especialista: "🔬", ocultista: "🌑" }[classe?.id] || "◈")} {classe?.name || "Mundano"}</Badge>
              <Badge>Ordem Paranormal</Badge>
            </div>
          </div>

          {/* ATTRIBUTES — pentagon constellation (no central orb) */}
          <div className="op-ink" style={{ padding: "12px 6px 6px", background: "rgba(0,0,0,0.25)" }}>
            <div className="op-label" style={{ textAlign: "center", marginBottom: 2 }}>Atributos</div>
            <AttrConstellation
              attrs={attrs}
              accent={theme.accent}
              edit={editMode}
              onRoll={(k) => rollAttr(k)}
              onEdit={editMode ? (k, v) => setAttrs((a) => ({ ...a, [k]: v })) : null}
            />
          </div>

          {/* NEX */}
          <div className="op-ink" style={{ padding: "10px 12px", background: "linear-gradient(135deg, rgba(74,14,110,0.22), rgba(0,0,0,0.4))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <button onClick={() => setShowNex(true)} aria-label="Matriz de progressão NEX" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", textAlign: "left" }}>
                <span className="op-label">Nível de Exposição ▸</span>
              </button>
              <span className="op-data" style={{ fontSize: 9, color: "var(--paranormal-text)" }}>{clearance}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "2px 0 7px" }}>
              <span style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 30, color: "var(--el-glow)", lineHeight: 1 }}>{nex}%</span>
              <span className="op-data" style={{ fontSize: 10, color: "var(--muted2)" }}>NEX · Nível {nexLevel(nex) + 1}</span>
              {editMode && (
                <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  <MiniBtn onClick={() => setNex((n) => Math.max(5, n === 99 ? 95 : n - 5))}>−</MiniBtn>
                  <MiniBtn onClick={() => setNex((n) => (n >= 95 ? 99 : n + 5))}>+</MiniBtn>
                </span>
              )}
            </div>
            <div style={{ height: 8, background: "rgba(0,0,0,0.55)", borderRadius: 2, overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ height: "100%", width: `${nex}%`, background: "linear-gradient(90deg, var(--paranormal), var(--el-accent))", boxShadow: "0 0 10px var(--el-glow)" }} />
            </div>
            {nex >= ELEMENT_UNLOCK_NEX && !elementoAfinidade && (
              <button onClick={() => setShowElementModal(true)} className="op-emrg"
                style={{ width: "100%", marginTop: 8, animation: "op-aura-pulse 1.6s ease-in-out infinite", borderColor: "var(--paranormal-text)", color: "var(--paranormal-text)" }}>
                ✦ Escolher Elemento
              </button>
            )}
          </div>

          {/* VITAL SIGNS */}
          <VitalSign label="PV · Vida" abbr="PV" value={hp} max={pvMax} color={pvColor} fill={pvFill(pvPct)}
            state={vitalState(pvPct, false)} onVal={setHp} onMax={setPvMax} edit={editMode} />
          <VitalSign label="Determinação · SAN" abbr="SAN" value={san} max={sanMax} color={sanColor} fill={sanColor}
            state={vitalState(sanPct, false)} onVal={setSan} onMax={setSanMax} edit={editMode} badge={breach ? "SURTO" : null} />
          <VitalSign label="Esforço · PE" abbr="PE" value={pe} max={peMax} color="#00acc1" fill="#00acc1"
            state={pe <= 0 ? "flat" : vitalState(pePct, false)} onVal={setPe} onMax={setPeMax} edit={editMode} badge={pe <= 0 ? "EXAUSTO" : null} />

          {/* DEFESAS */}
          <div className="op-ink" style={{ padding: "10px 12px", background: "rgba(0,0,0,0.25)" }}>
            <div className="op-label" style={{ marginBottom: 8 }}>Defesas</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Stat label="Defesa" value={defesa} />
              <Stat label="Esquiva" value={esquiva} />
              <Stat label="Bloqueio" value={bloqueio} edit={editMode} onChange={setBloqueio} />
              <Stat label="Proeficiência" value={proeficiencia} edit={editMode} onChange={setProeficiencia} />
            </div>
            {editMode && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <LabeledMini label="Defesa +bônus" value={defesaBonus} onChange={(v) => setDefesaBonus(parseInt(v, 10) || 0)} />
                <LabeledMini label="Esquiva +bônus" value={esquivaBonus} onChange={(v) => setEsquivaBonus(parseInt(v, 10) || 0)} />
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <Field label="Proteção" value={protecao} editMode={editMode} onChange={setProtecao} placeholder="ex: Colete (RD 5)" />
            </div>
            <div style={{ marginTop: 6 }}>
              <div className="op-label" style={{ marginBottom: 4 }}>Resistências</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {resistencias.map((r, i) => (
                  <span key={i} className="op-data" style={{ fontSize: 11, padding: "2px 8px", borderRadius: 3, background: "rgba(201,168,76,0.1)", border: "1px solid var(--border)", color: "var(--muted2)", display: "flex", alignItems: "center", gap: 5 }}>
                    {r}{editMode && <button onClick={() => setResistencias((a) => a.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer", padding: 0 }}>×</button>}
                  </span>
                ))}
                {editMode && (
                  <input placeholder="+ resistência" onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value.trim()) { setResistencias((a) => [...a, e.currentTarget.value.trim()]); e.currentTarget.value = ""; } }}
                    style={{ ...inputMini, width: 110, fontSize: 11 }} />
                )}
                {!editMode && resistencias.length === 0 && <span className="op-data" style={{ fontSize: 11, color: "var(--muted)" }}>nenhuma</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER: perícias ── */}
        <div className="op-ink op-col-panel" style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "rgba(0,0,0,0.22)" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border2)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="op-label" style={{ color: "var(--el-glow)" }}>Relatório de Capacidades</span>
              <span className="op-data" style={{ fontSize: 9, color: "var(--muted)" }}>{trained.size} ATIVAS</span>
            </div>
            <input value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} placeholder="🔍 filtrar perícia…" style={{ ...inputMini, fontFamily: "var(--font-data,'Share Tech Mono',monospace)" }} />
          </div>
          <div className="op-skill-head">
            <span />
            <span className="op-label" style={{ fontSize: 8 }}>Perícia</span>
            <span className="op-label" style={{ fontSize: 8, textAlign: "center" }}>Dados</span>
            <span className="op-label" style={{ fontSize: 8, textAlign: "center" }}>Bônus</span>
            <span className="op-label" style={{ fontSize: 8, textAlign: "center" }}>Treino</span>
            <span className="op-label" style={{ fontSize: 8, textAlign: "center" }}>Outros</span>
            <span />
          </div>
          <div className="op-col-rows" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
            {PERICIA_GRUPOS.map((g) => {
              const rows = filteredPericias.filter((p) => p.categoria === g.id);
              if (rows.length === 0) return null;
              const ativas = rows.filter((p) => (skillTreino[p.base] ?? (trained.has(p.base) ? 5 : 0)) > 0).length;
              const collapsed = skillFilter ? false : !!collapsedCats[g.id];
              return (
                <div key={g.id}>
                  <button onClick={() => setCollapsedCats((c) => ({ ...c, [g.id]: !c[g.id] }))} aria-expanded={!collapsed}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "7px 12px", background: "rgba(201,168,76,0.05)", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer" }}>
                    <span className="op-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--el-glow)" }}>{collapsed ? "▸" : "▾"}</span>{g.label}
                      <span style={{ color: "var(--muted)" }}>({rows.length})</span>
                    </span>
                    {ativas > 0 && <span className="op-data" style={{ fontSize: 9, color: "var(--el-glow)" }}>{ativas} ATIVA{ativas > 1 ? "S" : ""}</span>}
                  </button>
                  {!collapsed && rows.map(renderSkillRow)}
                </div>
              );
            })}
          </div>
          <div className="op-data" style={{ padding: "8px 12px", fontSize: 9, color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
            * Somente treinado · + Somente treinado com Bônus
          </div>
        </div>

        {/* ── RIGHT: tabs ── */}
        <div className="op-col" style={{ minWidth: 0 }}>
          <div style={{ display: "flex", width: "100%", borderBottom: "1px solid var(--border2)", position: "sticky", top: 0, zIndex: 2, background: "var(--bg)" }} role="tablist">
            {TABS.map(([id, lbl]) => (
              <div key={id} className={`op-tab ${activeTab === id ? "active" : ""}`} role="tab" aria-selected={activeTab === id} tabIndex={0}
                onClick={() => setActiveTab(id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveTab(id)}>{lbl}</div>
            ))}
          </div>
          <div className="op-ink" style={{ borderRadius: "0 0 6px 6px", padding: 14, background: "rgba(0,0,0,0.25)", minHeight: 280 }}>

            {activeTab === "combate" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div className="op-label" style={{ marginBottom: 6 }}>Console de Rolagem</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="op-data" style={{ color: "#4ade80", alignSelf: "center" }}>›</span>
                    <input ref={diceRef} className="op-terminal" value={diceInput} placeholder="ex: 2d6+3, 1d20, 4d4-1"
                      onChange={(e) => setDiceInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rollFree()} aria-label="Expressão de dados" />
                    <button className="op-rolar" onClick={rollFree}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.4" fill="currentColor" /><circle cx="16" cy="16" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></svg>Rolar
                    </button>
                  </div>
                  {rollHistory.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                      {rollHistory.slice(0, 5).map((h) => (
                        <div key={h.id} className="op-data" style={{ fontSize: 10, color: "var(--muted2)", display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.label} [{(h.rolls || []).join(",")}]</span>
                          <span style={{ color: h.crit ? "#ffe86a" : "var(--el-glow)", fontWeight: 700 }}>{h.result}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="op-label" style={{ marginBottom: 6 }}>Testes de Atributo</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
                    {ATTR_KEYS.map((k) => <button key={k} className="op-emrg" onClick={() => rollAttr(k)} aria-label={`Testar ${ATTR_LABELS[k]}`}>{k}</button>)}
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span className="op-label">Arsenal · {attacks.length}</span>
                    <MiniBtn onClick={add(setAttacks, { name: "Nova arma", dano: "1d6", critico: "", tipo: "", alcance: "" })}>+ Novo</MiniBtn>
                  </div>
                  {attacks.length === 0 ? <Empty>Nenhum ataque registrado.</Empty> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {attacks.map((a, i) => (
                        <div key={a.id || i} className="op-ink" style={{ padding: "9px 11px", background: "rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>⚔</span>
                            <input value={a.name || ""} onChange={(e) => upd(setAttacks)(i, { name: e.target.value })} style={{ ...inputMini, flex: 1, fontFamily: "var(--font-title,'Cinzel',serif)" }} />
                            <button className="op-rolar" style={{ padding: "6px 10px", fontSize: 9 }} onClick={() => rollAttack(a)}>🎲</button>
                            <button onClick={() => rm(setAttacks)(i)} aria-label="Remover" style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>×</button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                            <LabeledMini label="Dano" value={a.dano || ""} onChange={(v) => upd(setAttacks)(i, { dano: v })} />
                            <LabeledMini label="Crítico" value={a.critico || ""} onChange={(v) => upd(setAttacks)(i, { critico: v })} />
                            <LabeledMini label="Tipo" value={a.tipo || ""} onChange={(v) => upd(setAttacks)(i, { tipo: v })} />
                            <LabeledMini label="Alcance" value={a.alcance || ""} onChange={(v) => upd(setAttacks)(i, { alcance: v })} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "poderes" && (
              <ListEditor title="Poderes Paranormais" items={poderes} onAdd={add(setPoderes, { name: "Novo poder", nexReq: nex, peCost: "", desc: "", usos: 0 })}
                empty="Nenhum poder registrado." render={(p, i) => (
                  <div key={p.id || i} className="op-ink" style={{ padding: "10px 12px", background: "rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input value={p.name} onChange={(e) => upd(setPoderes)(i, { name: e.target.value })} style={{ ...inputMini, flex: 1, fontFamily: "var(--font-title,'Cinzel',serif)", color: "var(--el-glow)" }} />
                      <button onClick={() => rm(setPoderes)(i)} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "center" }}>
                      <LabeledMini label="NEX" value={p.nexReq} onChange={(v) => upd(setPoderes)(i, { nexReq: v })} />
                      <LabeledMini label="Custo PE" value={p.peCost} onChange={(v) => upd(setPoderes)(i, { peCost: v })} />
                      <span className="op-data" style={{ fontSize: 11, color: "var(--muted2)", display: "flex", alignItems: "center", gap: 4 }}>
                        usos <MiniBtn onClick={() => upd(setPoderes)(i, { usos: Math.max(0, (p.usos || 0) - 1) })}>−</MiniBtn>{p.usos || 0}<MiniBtn onClick={() => upd(setPoderes)(i, { usos: (p.usos || 0) + 1 })}>+</MiniBtn>
                      </span>
                    </div>
                    <textarea value={p.desc} onChange={(e) => upd(setPoderes)(i, { desc: e.target.value })} placeholder="Descrição…" style={{ minHeight: 50, fontSize: 13 }} />
                  </div>
                )} />
            )}

            {activeTab === "skills" && (
              <ListEditor title="Habilidades" items={skills} onAdd={add(setSkills, { name: "Nova habilidade", desc: "", categoria: "Geral" })}
                empty="Nenhuma habilidade registrada." render={(s, i) => (
                  <div key={s.id || i} className="op-ink" style={{ padding: "10px 12px", background: "rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input value={s.name} onChange={(e) => upd(setSkills)(i, { name: e.target.value })} style={{ ...inputMini, flex: 1, fontFamily: "var(--font-title,'Cinzel',serif)" }} />
                      <button onClick={() => rm(setSkills)(i)} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>×</button>
                    </div>
                    {s.desc !== undefined && (typeof s.desc === "string" && s.desc.includes("<")
                      ? <div style={{ fontSize: 13, color: "var(--muted2)" }} dangerouslySetInnerHTML={{ __html: s.desc }} />
                      : <textarea value={s.desc || ""} onChange={(e) => upd(setSkills)(i, { desc: e.target.value })} placeholder="Descrição…" style={{ minHeight: 44, fontSize: 13 }} />)}
                  </div>
                )} />
            )}

            {activeTab === "rituais" && (
              <ListEditor title="Rituais" items={rituais} onAdd={add(setRituais, { name: "Novo ritual", circulo: 1, elemento: "", alcance: "", execucao: "", duracao: "", resistencia: "", desc: "" })}
                empty="Nenhum ritual conhecido." render={(r, i) => (
                  <div key={r.id || i} className="op-ink" style={{ padding: "10px 12px", background: "rgba(74,14,110,0.12)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input value={r.name} onChange={(e) => upd(setRituais)(i, { name: e.target.value })} style={{ ...inputMini, flex: 1, fontFamily: "var(--font-title,'Cinzel',serif)", color: "var(--paranormal-text)" }} />
                      <button onClick={() => rm(setRituais)(i)} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      <LabeledMini label="Círculo" value={r.circulo} onChange={(v) => upd(setRituais)(i, { circulo: v })} />
                      <LabeledMini label="Elemento" value={r.elemento} onChange={(v) => upd(setRituais)(i, { elemento: v })} />
                      <LabeledMini label="Alcance" value={r.alcance} onChange={(v) => upd(setRituais)(i, { alcance: v })} />
                      <LabeledMini label="Execução" value={r.execucao} onChange={(v) => upd(setRituais)(i, { execucao: v })} />
                      <LabeledMini label="Duração" value={r.duracao} onChange={(v) => upd(setRituais)(i, { duracao: v })} />
                      <LabeledMini label="Resist." value={r.resistencia} onChange={(v) => upd(setRituais)(i, { resistencia: v })} />
                    </div>
                    <textarea value={r.desc} onChange={(e) => upd(setRituais)(i, { desc: e.target.value })} placeholder="Efeito…" style={{ minHeight: 48, fontSize: 13 }} />
                  </div>
                )} />
            )}

            {activeTab === "itens" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
                  <span className="op-label">Inventário</span>
                  <span className="op-data" style={{ fontSize: 11, color: "var(--muted2)", display: "flex", gap: 12, alignItems: "center" }}>
                    <span>Peso: <b style={{ color: "var(--el-glow)" }}>{totalPeso.toFixed(1)}</b></span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Créditos <input type="number" value={creditos} onChange={(e) => setCreditos(parseInt(e.target.value, 10) || 0)} style={{ ...inputMini, width: 70 }} /></span>
                    <MiniBtn onClick={add(setItens, { name: "Novo item", qtd: 1, peso: 0, desc: "" })}>+ Novo</MiniBtn>
                  </span>
                </div>
                {itens.length === 0 ? <Empty>Inventário vazio.</Empty> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {itens.map((it, i) => (
                      <div key={it.id || i} className="op-ink" style={{ padding: "8px 10px", background: "rgba(0,0,0,0.3)", display: "grid", gridTemplateColumns: "1fr 52px 52px 24px", gap: 6, alignItems: "center" }}>
                        <input value={it.name} onChange={(e) => upd(setItens)(i, { name: e.target.value })} style={inputMini} />
                        <LabeledMini label="Qtd" value={it.qtd} onChange={(v) => upd(setItens)(i, { qtd: v })} />
                        <LabeledMini label="Peso" value={it.peso} onChange={(v) => upd(setItens)(i, { peso: v })} />
                        <button onClick={() => rm(setItens)(i)} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "diario" && (
              <DiarioTab diario={diario} setDiario={setDiario} addEntry={add(setDiario, { date: new Date().toLocaleDateString("pt-BR"), title: "Nova entrada", text: "" })} upd={upd(setDiario)} rm={rm(setDiario)} />
            )}
          </div>

          {/* ── ELEMENT SECTION (unlocked) ── */}
          {elementoAfinidade && (
            <div className="op-ink" style={{ marginTop: 12, padding: 14, background: `linear-gradient(135deg, ${theme.accent}14, rgba(0,0,0,0.35))`, borderColor: theme.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <ElementoSymbol id={elementoAfinidade} size={26} />
                <div>
                  <div style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 16, color: theme.accent }}>{theme.sectionTitle}</div>
                  <div className="op-data" style={{ fontSize: 9, color: "var(--muted)" }}>Afinidade: {theme.name}</div>
                </div>
                <MiniBtn onClick={add(setElementoNotas, { text: "" })} style={{ marginLeft: "auto" }}>+ Novo</MiniBtn>
              </div>
              {elementoNotas.length === 0 ? <Empty>{theme.sectionHint}</Empty> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {elementoNotas.map((n, i) => (
                    <div key={n.id || i} style={{ display: "flex", gap: 6, alignItems: "start" }}>
                      <textarea value={n.text} onChange={(e) => upd(setElementoNotas)(i, { text: e.target.value })} placeholder={theme.sectionHint} style={{ minHeight: 38, fontSize: 13, flex: 1 }} />
                      <button onClick={() => rm(setElementoNotas)(i)} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ FOOTER readouts ═══ */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, position: "relative", zIndex: 1 }}>
        <Readout label="PD / Turno" value={`${peTurno + pdBonus}`} note="esforço por rodada" onStep={editMode ? (d) => setPdBonus((b) => b + d) : null} />
        <Readout label="Deslocamento" value={deslocamento} note="movimento por rodada" />
        <Readout label="Classe" value={classe?.name || "Mundano"} note={origem?.name || "sem origem"} />
        {breach && (
          <button className="op-emrg" onClick={() => setWhisperOn((v) => !v)} style={{ flex: "0 0 auto", alignSelf: "center" }} aria-pressed={whisperOn}>
            {whisperOn ? "🔇 Silenciar sussurro" : "🔊 Ouvir o Outro Lado"}
          </button>
        )}
      </div>

      {/* SAVE indicator */}
      <div style={{ position: "sticky", bottom: 0, display: "flex", justifyContent: "flex-end", marginTop: 10, pointerEvents: "none" }}>
        <span className="op-data" style={{ fontSize: 10, color: dirty ? "var(--gold2)" : "var(--muted)", background: "rgba(6,6,10,0.85)", padding: "5px 12px", borderRadius: 4, border: "1px solid var(--border)" }}>
          {dirty ? "● salvando…" : savedAt ? "✓ ficha salva" : "✓ sincronizado"}
        </span>
      </div>

      {/* ═══ OVERLAYS ═══ */}
      {roll && (roll.crit ? (
        /* ─── CRÍTICO: modal central fullscreen ─── */
        <div className="op-overlay op-screenshake" onClick={() => setRoll(null)} role="dialog" aria-label="Resultado crítico">
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: `inset 0 0 200px 70px ${theme.crisis.vignette}`, animation: "op-crit-vig 3s ease-in-out infinite" }} />
          <div className={`op-roll-card op-grain op-crit op-crit-${elementoAfinidade || "ordem"}`}>
            <div className="op-crit-bg" aria-hidden="true">
              <div className="op-crit-symbol"><ElementoSymbol id={elementoAfinidade || "ordem"} size={210} color={theme.primary} /></div>
              <div className="op-orbit">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="op-sigil" style={{ color: theme.primary, transform: `rotate(${i * 90}deg) translateX(140px)` }}>
                    {({ morte: "ᚦ", conhecimento: "ᚱ", sangue: "□", energia: "◇", medo: "◈" }[elementoAfinidade] || "ᚠ")}
                  </span>
                ))}
              </div>
              {elementoAfinidade === "sangue" && [0, 1, 2, 3, 4, 5].map((i) => (
                <span key={`d${i}`} className="op-drop" style={{ left: `${8 + i * 16}%`, animationDuration: `${1.6 + (i % 3) * 0.5}s`, animationDelay: `${i * 0.3}s` }} />
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, position: "relative", zIndex: 2 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--el-accent)" strokeWidth="1.6"><polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" /><path d="M3 7l9 5 9-5M12 12v10" opacity="0.5" /></svg>
              <span style={{ flex: 1, fontFamily: "var(--font-title,'Cinzel',serif)", fontSize: 13, letterSpacing: "0.08em", color: "var(--el-glow)", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{roll.attr}</span>
              <button className="op-roll-x" onClick={(e) => { e.stopPropagation(); setRoll(null); }} aria-label="Fechar">✕</button>
            </div>

            <div className="op-crit-badge">{roll.kind === "attack" ? "Acerto Crítico" : "Crítico"}</div>

            {roll.kind === "attack" ? (
              <div style={{ display: "flex", margin: "4px 0", position: "relative", zIndex: 2 }}>
                <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid var(--el-border)" }}>
                  <div className="op-result-num op-cd" style={{ fontSize: "clamp(52px,12vw,84px)", lineHeight: 1.1, color: "#ff3b3b", textShadow: "0 0 30px var(--el-glow)" }}>{roll.result}</div>
                  <div className="op-label">Ataque</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div className="op-result-num" style={{ fontSize: "clamp(52px,12vw,84px)", lineHeight: 1.1, color: "#fff", textShadow: "0 0 30px var(--el-glow)" }}>{roll.dano}</div>
                  <div className="op-label">Dano</div>
                </div>
              </div>
            ) : (
              <div className="op-result-num op-cp" style={{ fontSize: "clamp(80px,18vw,128px)", lineHeight: 1.05, textAlign: "center", color: "#fff", textShadow: "0 0 40px var(--el-glow)", position: "relative", zIndex: 2 }}>{roll.result}</div>
            )}

            <div style={{ height: 1, background: "linear-gradient(90deg,transparent,var(--el-accent),transparent)", opacity: 0.45, margin: "10px 0", position: "relative", zIndex: 2 }} />

            {Array.isArray(roll.rolls) && roll.rolls.length > 0 && (
              <div className="op-data" style={{ textAlign: "center", color: "var(--muted2)", fontSize: 14, letterSpacing: 1, position: "relative", zIndex: 2 }}>
                {roll.rolls.map((d, i) => (
                  <span key={i} className="op-die-pip" style={{ animationDelay: `${0.25 + i * 0.05}s`, color: d === 20 ? "var(--el-glow)" : undefined, fontWeight: d === 20 ? 700 : 400 }}>{i > 0 ? " · " : ""}{d}</span>
                ))}
              </div>
            )}

            <div className="op-label" style={{ marginTop: 14, textAlign: "center", color: "var(--muted)", position: "relative", zIndex: 2 }}>clique para fechar</div>
          </div>
        </div>
      ) : (
        /* ─── NORMAL: corner card fixo na viewport (portal em document.body) ─── */
        createPortal(
        <div className="op-corner" style={rootVars} role="status" aria-live="polite">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <ElementoSymbol id={elementoAfinidade || "ordem"} size={18} color={theme.primary} />
            <span style={{ flex: 1, fontFamily: "var(--font-title,'Cinzel',serif)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--el-glow)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{roll.attr}</span>
            <button className="op-corner-x" onClick={() => setRoll(null)} aria-label="Fechar">✕</button>
          </div>
          {roll.kind === "attack" ? (
            <div style={{ display: "flex" }}>
              <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid var(--el-border)" }}>
                <div style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 40, color: "var(--el-primary)", lineHeight: 1 }}>{roll.result}</div>
                <div className="op-label">Ataque</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 40, color: "#fff", lineHeight: 1 }}>{roll.dano}</div>
                <div className="op-label">Dano</div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 58, color: "var(--el-primary)", lineHeight: 1, textShadow: "0 0 18px var(--el-glow)" }}>{roll.result}</div>
              <div className="op-label" style={{ marginTop: 2 }}>resultado</div>
              {Array.isArray(roll.rolls) && roll.rolls.length > 0 && <div className="op-data" style={{ marginTop: 8, fontSize: 11, color: "var(--muted2)" }}>[{roll.rolls.join(" · ")}]</div>}
            </div>
          )}
        </div>,
        document.body
        )
      ))}

      {transEl && (
        <div className="op-el-transition" style={{ "--el-deep": getElementTheme(transEl).bg }}>
          <div className="op-el-erupt"><ElementoSymbol id={transEl} size={120} color={getElementTheme(transEl).accent} /></div>
        </div>
      )}

      {showElementModal && <ElementoAfinidadeModal onChoose={chooseElement} />}

      {showNex && (
        <Modal onClose={() => setShowNex(false)} title="Matriz de Progressão · NEX">
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "60vh", overflowY: "auto" }}>
            {NEX_LADDER.map((row) => {
              const cur = row.nex === nex; const reached = nex >= row.nex;
              return (
                <div key={row.nex} onClick={() => editMode && setNex(row.nex)}
                  style={{ display: "grid", gridTemplateColumns: "62px 110px 1fr", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 3, cursor: editMode ? "pointer" : "default", background: cur ? "rgba(201,168,76,0.16)" : reached ? "rgba(74,14,110,0.10)" : "transparent", border: `1px solid ${cur ? "var(--gold)" : "var(--border)"}`, opacity: reached ? 1 : 0.5 }}>
                  <span style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 18, color: reached ? "var(--gold2)" : "var(--muted)" }}>{row.nex}%</span>
                  <span className="op-data" style={{ fontSize: 9, letterSpacing: "0.1em", color: cur ? "var(--gold2)" : "var(--paranormal-text)" }}>{row.tier}</span>
                  <span style={{ fontSize: 13, color: "var(--muted2)" }}>{row.note}</span>
                </div>
              );
            })}
          </div>
          <div className="op-label" style={{ marginTop: 12, textAlign: "center", color: "var(--muted)" }}>
            {editMode ? "Clique em um nível para definir o NEX" : "Ative o modo de edição para alterar o NEX"}
          </div>
        </Modal>
      )}

      {showUpload && (
        <Modal onClose={() => setShowUpload(false)} title="Retrato do Agente">
          <input ref={portraitInput} type="file" accept="image/*" onChange={onPortrait} style={{ display: "none" }} />
          {form.avatar && <div className="op-ink" style={{ height: 200, marginBottom: 14, overflow: "hidden" }}><img src={form.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "sepia(0.42) contrast(1.06) brightness(0.95)" }} /></div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn-gold" onClick={() => portraitInput.current?.click()}>Enviar arquivo</button>
            <button className="btn-ghost" onClick={() => { setShowUpload(false); setShowAI(true); }}>✦ Gerar com IA</button>
            {form.avatar && <button className="btn-ghost" onClick={() => setForm((f) => ({ ...f, avatar: "" }))}>Remover</button>}
          </div>
          <div className="op-data" style={{ fontSize: 10, color: "var(--muted)", marginTop: 12 }}>O retrato recebe tratamento de fotografia desgastada automaticamente.</div>
        </Modal>
      )}

      {showAI && (
        <Modal onClose={() => setShowAI(false)} title="Gerar Retrato com IA · Higgsfield">
          <div className="op-label" style={{ marginBottom: 6 }}>Descreva o agente</div>
          <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="ex: mulher, 30 anos, cicatriz no rosto, casaco de investigadora, expressão séria…" style={{ minHeight: 90, fontSize: 14 }} />
          <div className="op-data" style={{ fontSize: 10, color: "var(--muted)", margin: "10px 0" }}>
            Prompt aplicado: investigador paranormal brasileiro, estilo Ordem Paranormal, iluminação cinematográfica sombria, retrato pintado…
          </div>
          <button className="btn-gold" disabled style={{ opacity: 0.55, cursor: "not-allowed" }} title="Integração Higgsfield — Fase 4">Gerar (em breve)</button>
          <div className="op-data" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>A geração consome créditos e será ativada nas configurações na Fase 4.</div>
        </Modal>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 *  SMALL PARTS
 * ════════════════════════════════════════════════════════════════════════ */
function Field({ label, value, editMode, onChange, placeholder }) {
  return (
    <div>
      <div className="op-label" style={{ marginBottom: 2 }}>{label}</div>
      {editMode ? (
        <input value={value === "—" ? "" : value} placeholder={placeholder} onChange={(e) => onChange?.(e.target.value)} style={{ padding: "4px 7px", fontSize: 13 }} />
      ) : (
        <div style={{ fontFamily: "var(--font-body,'IM Fell English',serif)", fontSize: 14, color: "var(--text)" }}>{value || "—"}</div>
      )}
    </div>
  );
}
function Badge({ children, accent }) {
  return <span className="op-data" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 3, background: accent ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.04)", border: `1px solid ${accent ? "var(--border2)" : "var(--border)"}`, color: accent ? "var(--gold2)" : "var(--muted2)" }}>{children}</span>;
}
function Stat({ label, value, edit, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 4px", border: "1px solid var(--border)", borderRadius: 3, background: "rgba(0,0,0,0.25)" }}>
      <span className="op-label" style={{ fontSize: 8 }}>{label}</span>
      {edit ? (
        <input type="number" value={value} onChange={(e) => onChange?.(parseInt(e.target.value, 10) || 0)} style={{ width: 48, textAlign: "center", padding: "2px", fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 16, color: "var(--gold2)" }} />
      ) : (
        <span style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 20, color: "var(--el-glow)" }}>{value}</span>
      )}
    </div>
  );
}
function MiniBtn({ children, onClick, style }) {
  return <button onClick={onClick} className="op-data" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid var(--border2)", color: "var(--gold2)", borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer", ...style }}>{children}</button>;
}
function LabeledMini({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="op-label" style={{ fontSize: 8 }}>{label}</span>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={{ padding: "3px 6px", fontSize: 12, fontFamily: "var(--font-data,'Share Tech Mono',monospace)" }} />
    </label>
  );
}
function Empty({ children }) {
  return <div className="op-data" style={{ fontSize: 11, color: "var(--muted)", padding: "14px 0", fontStyle: "italic" }}>{children}</div>;
}
function ListEditor({ title, items, onAdd, empty, render }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="op-label">{title}</span>
        <MiniBtn onClick={onAdd}>+ Novo</MiniBtn>
      </div>
      {items.length === 0 ? <Empty>{empty}</Empty> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items.map(render)}</div>}
    </div>
  );
}
function DiarioTab({ diario, addEntry, upd, rm }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState({});
  const list = diario.filter((e) => !q || `${e.title} ${e.text}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 buscar no diário…" style={{ padding: "5px 8px", fontSize: 13 }} />
        <MiniBtn onClick={addEntry}>+ Entrada</MiniBtn>
      </div>
      {list.length === 0 ? <Empty>Nenhuma entrada.</Empty> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((e, i) => {
            const realIdx = diario.indexOf(e);
            const isOpen = open[e.id] ?? i === 0;
            return (
              <div key={e.id || i} className="op-ink" style={{ background: "rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer" }} onClick={() => setOpen((o) => ({ ...o, [e.id]: !isOpen }))}>
                  <span className="op-data" style={{ fontSize: 9, color: "var(--muted)" }}>{e.date}</span>
                  <input value={e.title} onClick={(ev) => ev.stopPropagation()} onChange={(ev) => upd(realIdx, { title: ev.target.value })} style={{ flex: 1, padding: "3px 6px", fontSize: 13, fontFamily: "var(--font-title,'Cinzel',serif)" }} />
                  <button onClick={(ev) => { ev.stopPropagation(); rm(realIdx); }} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer" }}>×</button>
                  <span style={{ color: "var(--muted)" }}>{isOpen ? "▾" : "▸"}</span>
                </div>
                {isOpen && <textarea value={e.text} onChange={(ev) => upd(realIdx, { text: ev.target.value })} placeholder="Registre a sessão…" style={{ minHeight: 110, fontSize: 14, lineHeight: 1.6, border: "none", borderTop: "1px solid var(--border)", borderRadius: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function Readout({ label, value, note, onStep }) {
  return (
    <div className="op-ink" style={{ flex: "1 1 150px", padding: "9px 12px", display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(90deg, rgba(201,168,76,0.06), transparent)" }}>
      <div style={{ flex: 1 }}>
        <div className="op-label">{label}</div>
        <div style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 18, color: "var(--el-glow)", lineHeight: 1.1 }}>{value}</div>
        {note && <div className="op-data" style={{ fontSize: 9, color: "var(--muted)" }}>{note}</div>}
      </div>
      {onStep && <div style={{ display: "flex", flexDirection: "column", gap: 3 }}><MiniBtn onClick={() => onStep(1)}>+</MiniBtn><MiniBtn onClick={() => onStep(-1)}>−</MiniBtn></div>}
    </div>
  );
}
function Modal({ title, children, onClose }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(3,3,7,0.82)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="op-ink op-grain" style={{ width: "min(560px,100%)", maxHeight: "86vh", overflow: "auto", padding: 20, background: "var(--surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--font-display,'Cinzel Decorative',serif)", fontSize: 18, color: "var(--gold2)", margin: 0 }}>{title}</h3>
          <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", color: "var(--muted2)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
