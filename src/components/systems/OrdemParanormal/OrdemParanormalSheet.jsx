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
import HabilidadesTab from "./Tabs/HabilidadesTab";
import RituaisTab from "./Tabs/RituaisTab";
import InventarioTab from "./Tabs/InventarioTab";
import DescricaoTab from "./Tabs/DescricaoTab";
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

/* ── Diff helpers ──────────────────────────────────────────────────────── */
function stableStr(v) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return '[' + v.map(stableStr).join(',') + ']';
  const { id: _id, _id: __id, createdAt: _c, updatedAt: _u, ...rest } = v;
  return '{' + Object.keys(rest).sort().map(k => k + ':' + stableStr(rest[k])).join(',') + '}';
}

// Compara apenas campos escalares — ignora objetos aninhados (rich text, etc.)
function shallowChanged(a, b) {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return String(a ?? '') !== String(b ?? '');
  const SKIP = new Set(['id', '_id', 'createdAt', 'updatedAt']);
  const all = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of all) {
    if (SKIP.has(k)) continue;
    const av = a[k], bv = b[k];
    if (av && typeof av === 'object' && !Array.isArray(av) && bv && typeof bv === 'object' && !Array.isArray(bv)) continue;
    if (String(av ?? '') !== String(bv ?? '')) return true;
  }
  return false;
}

function buildDiff(base, proposed) {
  const items = []; let seq = 0;
  const add = (cat, label, type, old, next, applyFn) =>
    items.push({ id: String(seq++), cat, label, type, old, next, apply: applyFn });

  // Scalars
  [["Vitais","PV","pv"],["Vitais","PV máx","pvMax"],["Vitais","SAN","san"],["Vitais","SAN máx","sanMax"],
   ["Vitais","PE","pe"],["Vitais","PE máx","peMax"],["Progressão","NEX %","nex"],
   ["Progressão","PD bônus","pdBonus"],["Progressão","Créditos","creditos"],
   ["Defesa","Defesa equip.","defesaBonus"],["Defesa","Defesa outros","defesaOutros"],["Defesa","Esquiva bônus","esquivaBonus"],
   ["Defesa","Bloqueio","bloqueio"],["Defesa","Proteção","protecao"],
  ].forEach(([cat, label, k]) => {
    const o = base[k], n = proposed[k];
    if (n !== undefined && String(o ?? "") !== String(n ?? ""))
      add(cat, label, "changed", o, n, c => ({ ...c, [k]: n }));
  });

  // Form
  [["Nome","personagem"],["Jogador","jogador"],["Descrição","descricao"]].forEach(([label, k]) => {
    const o = k === "descricao" ? base[k] : base.form?.[k];
    const n = k === "descricao" ? proposed[k] : proposed.form?.[k];
    if (n !== undefined && stableStr(o) !== stableStr(n))
      add("Identidade", label, "changed", o, n,
        k === "descricao" ? c => ({ ...c, descricao: n }) : c => ({ ...c, form: { ...(c.form || {}), [k]: n } }));
  });

  // Atributos
  ["AGI","FOR","INT","PRE","VIG"].forEach(k => {
    const o = base.attrs?.[k], n = proposed.attrs?.[k];
    if (n !== undefined && String(o ?? "") !== String(n ?? ""))
      add("Atributos", k, "changed", o, n, c => ({ ...c, attrs: { ...(c.attrs || {}), [k]: n } }));
  });

  // Resistências
  const resKeys = new Set([...Object.keys(base.resistencias || {}), ...Object.keys(proposed.resistencias || {})]);
  resKeys.forEach(k => {
    const o = base.resistencias?.[k], n = proposed.resistencias?.[k];
    if (n !== undefined && String(o ?? "") !== String(n ?? ""))
      add("Resistências", k, "changed", o, n, c => ({ ...c, resistencias: { ...(c.resistencias || {}), [k]: n } }));
  });

  // Arrays (add/remove/modify)
  [["Rituais","rituais","nome"],["Itens","itens","nome"],["Habilidades","habilidades","nome"],
   ["Arsenal","attacks","name"],["Poderes","poderes","nome"],["Inventário","inventario","nome"],
  ].forEach(([cat, field, nk]) => {
    const bArr = Array.isArray(base[field]) ? base[field] : [];
    const pArr = Array.isArray(proposed[field]) ? proposed[field] : [];
    const bMap = new Map(bArr.map(x => [x?.[nk], x]));
    const pMap = new Map(pArr.map(x => [x?.[nk], x]));
    pArr.forEach(item => {
      const name = item?.[nk]; if (!name) return;
      if (!bMap.has(name))
        add(cat, name, "added", null, item, c => ({ ...c, [field]: [...(c[field] || []), item] }));
      else { const old = bMap.get(name); if (shallowChanged(old, item))
        add(cat, name, "changed", old, item, c => ({ ...c, [field]: (c[field] || []).map(x => x?.[nk] === name ? item : x) })); }
    });
    bArr.forEach(item => {
      const name = item?.[nk];
      if (name && !pMap.has(name))
        add(cat, name, "removed", item, null, c => ({ ...c, [field]: (c[field] || []).filter(x => x?.[nk] !== name) }));
    });
  });

  // Perícias treino
  const tLabel = v => v === 0 || v === false ? "Destreinado" : v === 1 || v === true ? "Treinado" : v === 2 ? "Veterano" : v === 3 ? "Expert" : String(v ?? "—");
  const allTreino = new Set([...Object.keys(base.skillTreino || {}), ...Object.keys(proposed.skillTreino || {})]);
  allTreino.forEach(sid => {
    const o = base.skillTreino?.[sid], n = proposed.skillTreino?.[sid];
    if (n !== undefined && String(o ?? "") !== String(n ?? ""))
      add("Perícias", `${sid} (treino)`, "changed", tLabel(o), tLabel(n), c => ({ ...c, skillTreino: { ...(c.skillTreino || {}), [sid]: n } }));
  });

  // Perícias bônus extra
  const allExtra = new Set([...Object.keys(base.skillOutros || {}), ...Object.keys(proposed.skillOutros || {})]);
  allExtra.forEach(sid => {
    const o = base.skillOutros?.[sid] ?? 0, n = proposed.skillOutros?.[sid] ?? 0;
    if (String(o) !== String(n) && (o || n))
      add("Perícias", `${sid} (bônus)`, "changed", o, n, c => ({ ...c, skillOutros: { ...(c.skillOutros || {}), [sid]: n } }));
  });

  return items;
}

function groupByCategory(diffs) {
  return diffs.reduce((acc, d) => { (acc[d.cat] = acc[d.cat] || []).push(d); return acc; }, {});
}

function fmtVal(v) {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return `[${v.length} itens]`;
  if (typeof v === "object") {
    if (v.type === 'doc' || Array.isArray(v.content)) return "(texto formatado)";
    return v.nome || v.name || "(modificado)";
  }
  const s = String(v); return s.length > 32 ? s.slice(0, 29) + "…" : s;
}

export default function OrdemParanormalSheet({ character, charId, onBack, onUpdate, onRoll, rollCampaign, onOpenHistory, readOnly, pendingEdits, onLoadPendingEdits, onApprovePendingEdit, onRejectPendingEdit, flushSaveRef, defaultEditMode }) {
  /* ── mobile section switcher (Ficha | Perícias | Ações) ── */
  const [mobileSec, setMobileSec] = useState("ficha");

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
  const [rituais, setRituais] = useState(character.rituais ?? []);
  // legados preservados no snapshot (migrados para habilidades/inventario; mantidos p/ não perder dados)
  const [skills] = useState(character.skills ?? []);
  const [poderes] = useState(character.poderes ?? []);
  const [itens] = useState(character.itens ?? []);
  const [diario] = useState(character.diario ?? []);
  const [creditos] = useState(character.creditos ?? 0);

  /* ── tab v2 state (migra dados legados de poderes/skills/itens na 1ª carga) ── */
  const [habilidades, setHabilidades] = useState(() => {
    // só migra na 1ª carga de uma ficha legada (campo ausente); depois respeita exclusões do jogador
    if (character.habilidades !== undefined) return character.habilidades;
    return [
      ...(character.poderes || []).map((p) => ({ id: p.id || Date.now() + Math.random(), nome: p.name || "Poder", descricao: p.desc || "", dados: "", imagem_url: "" })),
      ...(character.skills || []).map((s) => ({ id: s.id || Date.now() + Math.random(), nome: s.name || "Habilidade", descricao: typeof s.desc === "string" ? s.desc : "", dados: "", imagem_url: "" })),
    ];
  });
  const [inventario, setInventario] = useState(() => {
    if (character.inventario !== undefined) return character.inventario;
    const itensMig = (character.itens || []).map((it) => ({ id: it.id || Date.now() + Math.random(), nome: it.name || "Item", tipo: "geral", categoria: "I", espacos: Number(it.peso) || 0, descricao: it.desc || "", melhorias: [], is_equipado: false }));
    return { itens: itensMig, pontos_prestigio: 0 };
  });
  const [descricao, setDescricao] = useState(character.descricao ?? {});
  const [dtRituais, setDtRituais] = useState(character.dtRituais ?? 16);
  const [rollHistory, setRollHistory] = useState(character.rollHistory ?? []);
  const [trilha] = useState(character.trilha ?? null);

  const [defesaBonus, setDefesaBonus] = useState(character.defesaBonus ?? 0);
  const [defesaOutros, setDefesaOutros] = useState(character.defesaOutros ?? 0);
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
  const [editMode, setEditMode] = useState(!!defaultEditMode);
  const [activeTab, setActiveTab] = useState("combate");
  const [diceInput, setDiceInput] = useState("");
  const [roll, setRoll] = useState(null);
  const [showNex, setShowNex] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [showElementModal, setShowElementModal] = useState(false);
  const [transEl, setTransEl] = useState(null);
  const [skillFilter, setSkillFilter] = useState("");
  const [collapsedCats, setCollapsedCats] = useState({});
  const [whisperOn, setWhisperOn] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [copiedReader, setCopiedReader] = useState(false);
  const [copiedEditor, setCopiedEditor] = useState(false);
  const [showPendingPanel, setShowPendingPanel] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [selectedDiffs, setSelectedDiffs] = useState({});
  const isPublic = !!character.public;
  const editToken = character.editToken || null;

  // Auto-load pending edits when sheet opens (if public)
  useEffect(() => {
    if (isPublic && onLoadPendingEdits) onLoadPendingEdits();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charId, isPublic]);

  // Initialize selectedDiffs (all checked) when modal opens or edit changes
  useEffect(() => {
    if (!showPendingPanel || !pendingEdits?.length) return;
    const edit = pendingEdits[Math.min(reviewIdx, pendingEdits.length - 1)];
    if (!edit) return;
    const base = { ...character, attrs, form, pv: hp, san, pe, pvMax, sanMax, peMax,
      skillTreino, skillOutros, nex, pdBonus, creditos, defesaBonus, esquivaBonus,
      bloqueio, protecao, resistencias, rituais, itens, habilidades, attacks, poderes, inventario, descricao, diario };
    let diffs = [];
    try { diffs = buildDiff(base, edit.proposedData || {}); } catch(e) { console.error("buildDiff useEffect error", e); }
    const init = {}; diffs.forEach(d => { init[d.id] = true; });
    setSelectedDiffs(init);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPendingPanel, reviewIdx, pendingEdits?.length]);

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
    diario, creditos, rollHistory, trilha, defesaBonus, defesaOutros, esquivaBonus, bloqueio, protecao, resistencias,
    proeficiencia, elementoAfinidade, elementoEscolhidoEm, elementoGmOverride, elementoNotas,
    habilidades, inventario, descricao, dtRituais,
  };
  const latest = useRef(snapshot);
  latest.current = snapshot;
  if (flushSaveRef) flushSaveRef.current = () => onUpdate?.(latest.current);
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
      rituais, itens, diario, creditos, defesaBonus, defesaOutros, esquivaBonus, bloqueio, protecao, resistencias,
      proeficiencia, elementoAfinidade, elementoNotas, habilidades, inventario, descricao, dtRituais]);
  useEffect(() => () => flushSave(), []); // flush on unmount
  const handleBack = () => { flushSave(); onBack?.(); };

  /* ── derived ── */
  const { peTurno, deslocamento } = deriveStats(attrs, nex);
  const defesa = 10 + (attrs.AGI || 0) + defesaBonus + defesaOutros;
  const reflexosTreino = skillTreino["Reflexos"] ?? (trained.has("Reflexos") ? 5 : 0);
  const reflexosExtra  = skillOutros["Reflexos"] || 0;
  const esquiva = (attrs.AGI || 0) + reflexosTreino + reflexosExtra + esquivaBonus;
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
    onRoll?.(rollPayload(label, { ...res, expr: res.expr || label }, charName, elementoAfinidade));
    pushHistory({ label, rolls: res.rolls, result: res.result, crit: !!res.crit, ts: Date.now() });
  };
  const rollAttr = (k) => fireRoll(`${ATTR_LABELS[k]} (${k})`, { ...rollOP(attrs[k]), rollType: "attribute" });
  const rollSkill = (p) => {
    const ak = skillAttr[p.base] || p.attr;
    const base = rollOP(attrs[ak]);
    const tBonus = skillTreino[p.base] ?? (trained.has(p.base) ? 5 : 0);
    const other = Number(skillOutros[p.base] || 0);
    fireRoll(`${p.base} (${ak})`, { ...base, result: base.result + tBonus + other, rollType: "skill" });
  };
  const rollFree = () => {
    const res = rollExpr(diceInput);
    if (!res) { setRoll({ phase: "result", attr: "ERRO", rolls: [], result: "ex: 1d20+3", crit: false }); return; }
    fireRoll(diceInput.toUpperCase(), { ...res, expr: diceInput, rollType: "custom" });
    setDiceInput("");
  };
  const rollAttack = (a) => {
    const atkAttr = a.attr || "FOR"; // teste de ataque (Luta/Pontaria) — usa FOR por padrão
    const atk = rollOP(attrs[atkAttr] || 1);
    const dmg = rollExpr(a.dano || a.damage || "1d6") || { rolls: [0], result: 0, dice: "D6" };
    fireRoll(a.name || "Ataque", { ...atk, kind: "attack", rollType: "attack", dano: dmg.result, danoRolls: dmg.rolls });
  };
  /* rolagem livre de uma notação de dados (habilidades, rituais, dano de item) → corner card */
  const rollDados = (label, expr) => {
    const res = rollExpr(expr);
    if (!res) return;
    fireRoll(label || expr, { ...res, expr, rollType: "custom" });
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

  const onGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const elName = elementoAfinidade ? theme.name : "Ordem Paranormal";
      const classeNome = classe?.name || "agente";
      const basePrompt = `portrait photo of a ${classeNome} paranormal investigator, ${aiPrompt.trim()}, ${elName} element aesthetic, cinematic dramatic lighting, dark atmospheric, photorealistic, film grain, detailed face, upper body`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(basePrompt)}?width=512&height=768&nologo=true&model=flux&seed=${Date.now()}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Falha ao gerar");
      const blob = await resp.blob();
      const base64 = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = (ev) => res(ev.target.result);
        reader.readAsDataURL(blob);
      });
      const downscaled = await downscale(new File([blob], "ai.jpg", { type: blob.type }));
      setForm((f) => ({ ...f, avatar: downscaled }));
      setShowAI(false);
    } catch (e) {
      setAiError("Erro ao gerar imagem. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
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

  const TABS = [["combate", "Combate"], ["habilidades", "Habilidades"], ["rituais", "Rituais"], ["inventario", "Inventário"], ["descricao", "Descrição"]];
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
          {!readOnly && charId && (
            <div style={{ position: "relative", display:"flex", gap:6 }}>
              {/* Pending edits badge */}
              {isPublic && pendingEdits?.length > 0 && (
                <button className="btn-ghost" onClick={() => { setShowPendingPanel(v=>!v); setShowShare(false); setReviewIdx(0); }}
                  style={{ borderColor:"rgba(251,191,36,0.5)", color:"#fbbf24", position:"relative" }}>
                  ✎ Revisões
                  <span style={{ position:"absolute", top:-6, right:-6, width:16, height:16, borderRadius:"50%", background:"#fbbf24", color:"#000", fontFamily:"Cinzel,serif", fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{pendingEdits.length}</span>
                </button>
              )}
              {isPublic && !pendingEdits && onLoadPendingEdits && (
                <button className="btn-ghost" onClick={onLoadPendingEdits} title="Verificar sugestões pendentes" style={{ fontSize:10 }}>↻</button>
              )}
              <button className="btn-ghost" onClick={() => { setShowShare(v => !v); setShowPendingPanel(false); if (!showShare && isPublic && onLoadPendingEdits) onLoadPendingEdits(); }}
                style={isPublic ? { borderColor:"rgba(74,222,128,0.5)", color:"#4ade80" } : undefined}>
                {isPublic ? "🔗 Pública" : "🔗 Compartilhar"}
              </button>

              {/* Share popover */}
              {showShare && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:50, width:300,
                  background:"var(--card,#111)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8,
                  padding:"14px", boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}>
                  <div style={{ fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:"0.1em", color:"rgba(255,255,255,0.45)", textTransform:"uppercase", marginBottom:10 }}>Compartilhar Dossiê</div>
                  {isPublic && (
                    <>
                      {/* Link Leitor */}
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontFamily:"Cinzel,serif", fontSize:9, color:"rgba(255,255,255,0.4)", marginBottom:4, letterSpacing:"0.08em", textTransform:"uppercase" }}>👁 Link de Leitor</div>
                        <div style={{ display:"flex", gap:6 }}>
                          <input readOnly value={`${window.location.origin}/p/${charId}`}
                            style={{ flex:1, background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:4, color:"#eee", padding:"5px 8px", fontSize:10, fontFamily:"monospace", minWidth:0 }}/>
                          <button className="btn-ghost" style={{ flexShrink:0, fontSize:10 }}
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${charId}`); setCopiedReader(true); setTimeout(()=>setCopiedReader(false),2000); }}>
                            {copiedReader ? "✓" : "Copiar"}
                          </button>
                        </div>
                      </div>
                      {/* Link Editor */}
                      {editToken && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontFamily:"Cinzel,serif", fontSize:9, color:"rgba(74,222,128,0.7)", marginBottom:4, letterSpacing:"0.08em", textTransform:"uppercase" }}>✏ Link de Editor</div>
                          <div style={{ display:"flex", gap:6 }}>
                            <input readOnly value={`${window.location.origin}/p/${charId}?editor=${editToken}`}
                              style={{ flex:1, background:"rgba(0,0,0,0.4)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:4, color:"#eee", padding:"5px 8px", fontSize:10, fontFamily:"monospace", minWidth:0 }}/>
                            <button className="btn-ghost" style={{ flexShrink:0, fontSize:10, borderColor:"rgba(74,222,128,0.3)", color:"#4ade80" }}
                              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${charId}?editor=${editToken}`); setCopiedEditor(true); setTimeout(()=>setCopiedEditor(false),2000); }}>
                              {copiedEditor ? "✓" : "Copiar"}
                            </button>
                          </div>
                          <div style={{ fontFamily:"Cinzel,serif", fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:4 }}>Editores podem sugerir alterações para você aprovar.</div>
                        </div>
                      )}
                    </>
                  )}
                  <button style={{ width:"100%", padding:"8px", fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", borderRadius:6,
                    border: isPublic ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(74,222,128,0.4)",
                    background: isPublic ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.08)",
                    color: isPublic ? "#f87171" : "#4ade80" }}
                    onClick={() => {
                      const newToken = isPublic ? (editToken || null) : (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
                      const updated = { ...character, ...form, public: !isPublic, editToken: newToken };
                      onUpdate?.(updated);
                      setShowShare(false);
                    }}>
                    {isPublic ? "Tornar privada" : "Tornar pública"}
                  </button>
                </div>
              )}

              {/* Pending modal → via portal at end of return */}
            </div>
          )}
        </div>
        {showShortcuts && (
          <div className="op-ink op-data" style={{ marginTop: 8, padding: "8px 12px", fontSize: 11, color: "var(--muted2)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span><b style={{ color: "var(--gold2)" }}>R</b> rolador</span>
            <span><b style={{ color: "var(--gold2)" }}>E</b> modo edição</span>
            <span><b style={{ color: "var(--gold2)" }}>1–5</b> testar AGI/FOR/INT/PRE/VIG</span>
          </div>
        )}

        {/* ── Mobile section switcher — hidden on desktop ── */}
        <div className="op-mobile-secnav">
          {[["ficha","◈ Ficha"],["pericias","⬢ Perícias"],["abas","⚔ Ações"]].map(([id, lbl]) => (
            <button key={id} className={`op-mobile-secbtn${mobileSec === id ? " active" : ""}`}
              onClick={() => setMobileSec(id)}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 3-COLUMN DOSSIER ═══ */}
      <div className="op-sheet-grid" style={{ position: "relative", zIndex: 1 }}>

        {/* ── LEFT ── */}
        <div className={`op-col op-stagger${mobileSec !== "ficha" ? " op-mobile-hidden" : ""}`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          <div className="op-ink" style={{ padding: "12px 14px", background: "rgba(0,0,0,0.25)" }}>

            {/* Linha principal: escudo + fórmula + BLOQUEIO/ESQUIVA */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:12 }}>

              {/* Escudo */}
              <div style={{ position:"relative", flexShrink:0 }}>
                <svg width="54" height="62" viewBox="0 0 54 62" fill="none">
                  <path d="M27 3 L5 11 V31 C5 45 27 59 27 59 C27 59 49 45 49 31 V11 Z"
                    fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>
                </svg>
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontFamily:"Cinzel,serif", fontWeight:700, fontSize:20, color:"#fff", lineHeight:1 }}>{defesa}</span>
                </div>
              </div>

              {/* Fórmula */}
              <div style={{ flex:1, paddingTop:3 }}>
                <div className="op-label" style={{ marginBottom:6, fontSize:9 }}>Defesa</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"rgba(255,255,255,0.45)" }}>
                    = 10 + <span style={{ color:"rgba(255,255,255,0.75)" }}>{attrs.AGI||0}</span> AGI
                  </span>
                  <span style={{ color:"rgba(255,255,255,0.3)", fontSize:12 }}>+</span>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
                    {editMode
                      ? <input type="number" value={defesaBonus} onChange={e => setDefesaBonus(parseInt(e.target.value)||0)}
                          style={{ ...inputMini, width:38, textAlign:"center", fontSize:12, padding:"2px 4px" }}/>
                      : <span style={{ fontFamily:"Cinzel,serif", fontWeight:700, fontSize:13, color:"#fff" }}>{defesaBonus}</span>}
                    <span style={{ fontSize:8, color:"rgba(255,255,255,0.3)", letterSpacing:"0.04em" }}>Equip.</span>
                  </div>
                  <span style={{ color:"rgba(255,255,255,0.3)", fontSize:12 }}>+</span>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
                    {editMode
                      ? <input type="number" value={defesaOutros} onChange={e => setDefesaOutros(parseInt(e.target.value)||0)}
                          style={{ ...inputMini, width:38, textAlign:"center", fontSize:12, padding:"2px 4px" }}/>
                      : <span style={{ fontFamily:"Cinzel,serif", fontWeight:700, fontSize:13, color:"#fff" }}>{defesaOutros}</span>}
                    <span style={{ fontSize:8, color:"rgba(255,255,255,0.3)", letterSpacing:"0.04em" }}>Outros.</span>
                  </div>
                </div>
              </div>

              {/* BLOQUEIO + ESQUIVA */}
              <div style={{ display:"flex", gap:16, flexShrink:0, paddingTop:2 }}>
                <div style={{ textAlign:"center" }}>
                  <div className="op-label" style={{ marginBottom:4, fontSize:9 }}>Bloqueio</div>
                  {editMode
                    ? <input type="number" value={bloqueio} onChange={e => setBloqueio(parseInt(e.target.value)||0)}
                        style={{ ...inputMini, width:42, textAlign:"center", fontSize:16, padding:"2px 4px" }}/>
                    : <div style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", lineHeight:1 }}>{bloqueio}</div>}
                </div>
                <div style={{ textAlign:"center" }}>
                  <div className="op-label" style={{ marginBottom:4, fontSize:9 }}>Esquiva</div>
                  <div style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", lineHeight:1 }}>{esquiva}</div>
                  <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:"rgba(255,255,255,0.3)", marginTop:3, whiteSpace:"nowrap" }}>
                    AGI{reflexosTreino > 0 ? `+R${reflexosTreino}` : ""}{reflexosExtra > 0 ? `+${reflexosExtra}` : ""}{esquivaBonus > 0 ? `+${esquivaBonus}` : ""}
                  </div>
                  <div style={{ fontFamily:"monospace", fontSize:7, color:"#f87171", marginTop:2 }}>
                    dbg: sk={JSON.stringify(skillTreino["Reflexos"])} tr={reflexosTreino} cls={classe?.id}
                  </div>
                  {editMode && (
                    <input type="number" value={esquivaBonus} onChange={e => setEsquivaBonus(parseInt(e.target.value)||0)}
                      style={{ ...inputMini, width:42, textAlign:"center", fontSize:10, padding:"2px 4px", marginTop:3 }} placeholder="+bônus"/>
                  )}
                </div>
              </div>
            </div>

            <div style={{ height:1, background:"rgba(255,255,255,0.06)", marginBottom:10 }}/>

            {/* PROTEÇÃO */}
            <div style={{ marginBottom:8 }}>
              <Field label="Proteção" value={protecao} editMode={editMode} onChange={setProtecao} placeholder="ex: Colete (RD 5)" />
            </div>

            {/* RESISTÊNCIAS */}
            <div style={{ marginBottom:8 }}>
              <div className="op-label" style={{ marginBottom:4 }}>Resistências</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {resistencias.map((r, i) => (
                  <span key={i} className="op-data" style={{ fontSize:11, padding:"2px 8px", borderRadius:3, background:"rgba(201,168,76,0.1)", border:"1px solid var(--border)", color:"var(--muted2)", display:"flex", alignItems:"center", gap:5 }}>
                    {r}{editMode && <button onClick={() => setResistencias((a) => a.filter((_, idx) => idx !== i))} style={{ background:"none", border:"none", color:"var(--danger-text)", cursor:"pointer", padding:0 }}>×</button>}
                  </span>
                ))}
                {editMode && (
                  <input placeholder="+ resistência" onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value.trim()) { setResistencias((a) => [...a, e.currentTarget.value.trim()]); e.currentTarget.value = ""; } }}
                    style={{ ...inputMini, width:110, fontSize:11 }} />
                )}
                {!editMode && resistencias.length === 0 && <span className="op-data" style={{ fontSize:11, color:"var(--muted)" }}>nenhuma</span>}
              </div>
            </div>

            {/* PROFICIÊNCIAS */}
            <div>
              <div className="op-label" style={{ marginBottom:4 }}>Proficiências</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontFamily:"Cinzel,serif", fontSize:18, fontWeight:700, color:"var(--gold)" }}>+{proeficiencia}</span>
                {editMode && (
                  <input type="number" value={proeficiencia} onChange={e => setProeficiencia(parseInt(e.target.value)||0)}
                    style={{ ...inputMini, width:50, fontSize:12, padding:"2px 6px" }}/>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER: perícias ── */}
        <div className={`op-ink op-col-panel${mobileSec !== "pericias" ? " op-mobile-hidden" : ""}`} style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "rgba(0,0,0,0.22)" }}>
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
        <div className={`op-col${mobileSec !== "abas" ? " op-mobile-hidden" : ""}`} style={{ minWidth: 0 }}>
          <div className="op-tabs-row" style={{ borderBottom: "1px solid var(--border2)", position: "sticky", top: 0, zIndex: 2, background: "var(--bg)" }} role="tablist">
            {TABS.map(([id, lbl]) => (
              <div key={id} className={`op-tab ${activeTab === id ? "active" : ""}`} role="tab" aria-selected={activeTab === id} tabIndex={0}
                onClick={() => setActiveTab(id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveTab(id)}>{lbl}</div>
            ))}
          </div>
          <div className="op-ink" style={{ borderRadius: "0 0 6px 6px", padding: 14, background: "rgba(0,0,0,0.25)", minHeight: 280 }}>

            {activeTab === "combate" && (
              <CombateTab
                diceRef={diceRef} diceInput={diceInput} setDiceInput={setDiceInput} rollFree={rollFree}
                attrs={attrs} rollAttr={rollAttr} attacks={attacks} setAttacks={setAttacks}
                rollAttack={rollAttack} upd={upd} rm={rm} add={add}
                rollCampaign={rollCampaign} onOpenHistory={onOpenHistory}
              />
            )}

            {activeTab === "habilidades" && (
              <HabilidadesTab habilidades={habilidades} setHabilidades={setHabilidades} onRollDados={rollDados} nex={nex} classe={classe} />
            )}

            {activeTab === "rituais" && (
              <RituaisTab rituais={rituais} setRituais={setRituais} dtRituais={dtRituais} setDtRituais={setDtRituais} onRollDados={rollDados} />
            )}

            {activeTab === "inventario" && (
              <InventarioTab inventario={inventario} setInventario={setInventario} onRollDados={rollDados} attrs={attrs} nex={nex} />
            )}

            {activeTab === "descricao" && (
              <DescricaoTab descricao={descricao} setDescricao={setDescricao} isMaster={!!character.viewerIsMaster} />
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

      {/* ── Pending Edits Drawer (portal) ─────────────────────────────── */}
      {showPendingPanel && pendingEdits?.length > 0 && (() => { try {
        const safeIdx = Math.min(reviewIdx, pendingEdits.length - 1);
        const edit = pendingEdits[safeIdx];
        if (!edit) return null;
        const proposed = edit.proposedData || {};
        const base = { ...character, attrs, form, pv: hp, san, pe, pvMax, sanMax, peMax,
          skillTreino, skillOutros, nex, pdBonus, creditos, defesaBonus, defesaOutros, esquivaBonus,
          bloqueio, protecao, resistencias, rituais, itens, habilidades, attacks, poderes, inventario, descricao, diario };
        let diffs = []; let _diffErr = null;
        try { diffs = buildDiff(base, proposed); } catch(e) { _diffErr = String(e); }
        const grouped = groupByCategory(diffs);
        const selCount = Object.values(selectedDiffs).filter(Boolean).length;
        const typeColor = t => t==="added"?"#4ade80":t==="removed"?"#f87171":"#fbbf24";
        const typeIcon  = t => t==="added"?"✚":t==="removed"?"✘":"↻";
        return createPortal(
          <div style={{ position:"fixed", inset:0, zIndex:100000, display:"flex" }}>
            <div style={{ flex:1, background:"rgba(0,0,0,0.72)" }} onClick={() => setShowPendingPanel(false)}/>
            <div style={{ width:"min(500px,100vw)", background:"#1a1a24", borderLeft:"2px solid #fbbf24", display:"flex", flexDirection:"column", overflow:"hidden", color:"#fff" }}>
              {/* Header */}
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #ffffff14", background:"#22222e", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontFamily:"Cinzel,serif", fontSize:12, letterSpacing:"0.1em", color:"#fbbf24", textTransform:"uppercase", marginBottom:5 }}>
                    Sugestão {safeIdx+1}/{pendingEdits.length}
                    {pendingEdits.length > 1 && <span style={{ marginLeft:10 }}>
                      <button onClick={() => setReviewIdx(i => Math.max(0,i-1))} disabled={safeIdx===0} style={{ background:"none", border:"1px solid #ffffff25", borderRadius:3, color:"#ccc", fontSize:13, padding:"1px 8px", cursor:"pointer", marginRight:2 }}>‹</button>
                      <button onClick={() => setReviewIdx(i => Math.min(pendingEdits.length-1,i+1))} disabled={safeIdx===pendingEdits.length-1} style={{ background:"none", border:"1px solid #ffffff25", borderRadius:3, color:"#ccc", fontSize:13, padding:"1px 8px", cursor:"pointer" }}>›</button>
                    </span>}
                  </div>
                  <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"rgba(255,255,255,0.55)" }}>
                    ✎ <b style={{ color:"#eee", fontFamily:"Cinzel,serif" }}>{edit.editorName}</b> · {new Date(edit.timestamp).toLocaleString("pt-BR")}
                  </div>
                </div>
                <button onClick={() => setShowPendingPanel(false)} style={{ background:"none", border:"1px solid #ffffff30", borderRadius:4, color:"#fff", fontSize:14, lineHeight:1, padding:"3px 8px", cursor:"pointer" }}>✕</button>
              </div>
              {/* Select all / none */}
              <div style={{ padding:"10px 20px", borderBottom:"1px solid #ffffff0a", background:"#1e1e28", display:"flex", gap:8, alignItems:"center" }}>
                <button onClick={() => { const a={}; diffs.forEach(d=>{a[d.id]=true;}); setSelectedDiffs(a); }} style={{ background:"none", border:"1px solid #ffffff30", borderRadius:4, color:"#ccc", fontSize:11, padding:"4px 12px", cursor:"pointer" }}>Selecionar tudo</button>
                <button onClick={() => setSelectedDiffs({})} style={{ background:"none", border:"1px solid #ffffff30", borderRadius:4, color:"#ccc", fontSize:11, padding:"4px 12px", cursor:"pointer" }}>Desmarcar tudo</button>
                <span style={{ marginLeft:"auto", fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"rgba(255,255,255,0.45)" }}>{selCount}/{diffs.length} selecionadas</span>
              </div>
              {/* Diff list */}
              <div style={{ flex:1, overflowY:"auto", padding:"12px 20px", background:"#1a1a24" }}>
                {diffs.length === 0 && (
                  <div style={{ textAlign:"center", padding:"32px 20px" }}>
                    <div style={{ fontFamily:"Cinzel,serif", fontSize:14, color:"rgba(255,255,255,0.4)" }}>Nenhuma alteração detectada.</div>
                  </div>
                )}
                {Object.entries(grouped).map(([cat, catDiffs]) => (
                  <div key={cat} style={{ marginBottom:14 }}>
                    <div style={{ fontFamily:"Cinzel,serif", fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(255,255,255,0.4)", marginBottom:6, paddingBottom:4, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>{cat}</div>
                    {catDiffs.map(diff => {
                      const sel = !!selectedDiffs[diff.id];
                      const tc = typeColor(diff.type);
                      return (
                        <div key={diff.id} onClick={() => setSelectedDiffs(s => ({...s, [diff.id]: !s[diff.id]}))}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:6, marginBottom:4, cursor:"pointer",
                            background: sel ? `${tc}10` : "rgba(255,255,255,0.025)",
                            border:`1px solid ${sel ? tc+"44" : "rgba(255,255,255,0.07)"}` }}>
                          {/* Checkbox */}
                          <div style={{ width:17, height:17, borderRadius:3, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11,
                            border:`1.5px solid ${sel?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.2)"}`, background:sel?"rgba(255,255,255,0.15)":"transparent" }}>
                            {sel && "✓"}
                          </div>
                          {/* Icon */}
                          <span style={{ fontSize:13, flexShrink:0, color:tc, width:14, textAlign:"center" }}>{typeIcon(diff.type)}</span>
                          {/* Label */}
                          <span style={{ fontFamily:"Cinzel,serif", fontSize:12, color:"rgba(255,255,255,0.85)", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{diff.label}</span>
                          {/* Values */}
                          {diff.type === "changed" && (
                            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, flexShrink:0, whiteSpace:"nowrap" }}>
                              <span style={{ color:"#f87171" }}>{fmtVal(diff.old)}</span>
                              <span style={{ color:"rgba(255,255,255,0.3)" }}> → </span>
                              <span style={{ color:"#4ade80" }}>{fmtVal(diff.next)}</span>
                            </span>
                          )}
                          {diff.type !== "changed" && (
                            <span style={{ fontFamily:"Cinzel,serif", fontSize:10, color:tc, border:`1px solid ${tc}50`, padding:"2px 9px", borderRadius:10, flexShrink:0 }}>
                              {diff.type === "added" ? "novo" : "remover"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {/* Footer */}
              <div style={{ padding:"14px 20px", borderTop:"1px solid #ffffff14", background:"#22222e", display:"flex", gap:8 }}>
                <button disabled={selCount === 0}
                  style={{ flex:2, padding:"11px", fontFamily:"Cinzel,serif", fontSize:12, letterSpacing:"0.07em", textTransform:"uppercase", cursor:selCount===0?"not-allowed":"pointer", borderRadius:6, border:"1px solid rgba(74,222,128,0.4)", background:"rgba(74,222,128,0.08)", color:"#4ade80", opacity:selCount===0?0.4:1 }}
                  onClick={() => {
                    let merged = { ...base };
                    diffs.forEach(d => { if (selectedDiffs[d.id]) merged = d.apply(merged); });
                    onApprovePendingEdit?.(edit, merged);
                    if (safeIdx >= pendingEdits.length - 1) setReviewIdx(Math.max(0, safeIdx-1));
                    setShowPendingPanel(false);
                  }}>
                  ✓ Aplicar selecionadas ({selCount})
                </button>
                <button style={{ flex:1, padding:"11px", fontFamily:"Cinzel,serif", fontSize:12, letterSpacing:"0.07em", textTransform:"uppercase", cursor:"pointer", borderRadius:6, border:"1px solid rgba(239,68,68,0.35)", background:"rgba(239,68,68,0.07)", color:"#f87171" }}
                  onClick={() => { onRejectPendingEdit?.(edit); if (safeIdx >= pendingEdits.length - 1) setReviewIdx(Math.max(0, safeIdx-1)); setShowPendingPanel(false); }}>
                  ✗ Rejeitar
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      } catch(e) { console.error("PendingPanel render error:", e); return null; } })()}

      {showAI && (
        <Modal onClose={() => { setShowAI(false); setAiError(""); }} title="✦ Gerar Retrato com IA">
          <div className="op-label" style={{ marginBottom: 6 }}>Descreva o agente</div>
          <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="ex: mulher, 30 anos, cicatriz no rosto, casaco de investigadora, expressão séria, cabelo curto…"
            style={{ minHeight: 90, fontSize: 14, width: "100%", resize: "vertical" }}
            onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && onGenerateAI()} />
          <div className="op-data" style={{ fontSize: 10, color: "var(--muted)", margin: "8px 0 12px",
            padding: "6px 10px", background: "rgba(201,168,76,0.06)", borderRadius: 4, border: "1px solid var(--border2)" }}>
            O sistema adiciona automaticamente: estilo cinematográfico, elemento <b style={{ color: "var(--el-glow)" }}>{elementoAfinidade ? theme.name : "Ordem Paranormal"}</b>, iluminação sombria e grain de filme.
          </div>
          {aiError && <div style={{ color: "#e05555", fontSize: 12, marginBottom: 8 }}>{aiError}</div>}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn-gold" onClick={onGenerateAI} disabled={aiLoading || !aiPrompt.trim()}
              style={{ opacity: aiLoading || !aiPrompt.trim() ? 0.6 : 1 }}>
              {aiLoading ? "⏳ Gerando…" : "✦ Gerar Retrato"}
            </button>
            {aiLoading && <span className="op-data" style={{ fontSize: 11, color: "var(--muted)" }}>~15–30 segundos…</span>}
          </div>
          <div className="op-data" style={{ fontSize: 10, color: "var(--muted)", marginTop: 10 }}>Ctrl+Enter para gerar · Gratuito · Powered by Flux AI</div>
        </Modal>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 *  COMBATE TAB — console de rolagem, testes de atributo, arsenal
 * ════════════════════════════════════════════════════════════════════════ */
const isRanged = (a) => {
  const al = (a.alcance || "").toLowerCase().trim();
  const ta = (a.tipo_arma || "").toLowerCase();
  if (ta.includes("disparo") || ta.includes("fogo") || ta.includes("distância")) return true;
  return al && al !== "—" && al !== "-" && !al.includes("corpo");
};
function ArsenalCard({ a, i, attrs, upd, rm, setAttacks, rollAttack }) {
  const [expanded, setExpanded] = useState(false);
  const ranged = isRanged(a);
  const attrKey = a.attr || (ranged ? "AGI" : "FOR");
  const attrVal = attrs[attrKey] ?? 0;
  const tag = (color) => ({
    fontFamily: "var(--font-data,'Share Tech Mono',monospace)", fontSize: 10,
    padding: "2px 7px", borderRadius: 3, border: `1px solid ${color}40`,
    background: `${color}12`, color, whiteSpace: "nowrap",
  });
  return (
    <div className="op-arsenal-row" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{ranged ? "🔫" : "⚔️"}</span>
        <span style={{ flex: 1, fontFamily: "var(--font-title,'Cinzel',serif)", fontWeight: 600, fontSize: 13,
          letterSpacing: "0.04em", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
          onClick={() => setExpanded(v => !v)}>{a.name || "Sem nome"}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
          {a.dano && <span style={tag("var(--el-accent)")}>{a.dano}</span>}
          {a.tipo && <span style={tag("var(--muted2)")}>{a.tipo}</span>}
          {a.alcance && <span style={tag("#7a9ed4")}>{a.alcance}</span>}
          <span style={{ ...tag("var(--el-glow)"), fontWeight: 700 }} title={`Teste: ${attrKey}`}>{attrKey} {attrVal}</span>
        </div>
        <button className="op-rolar" style={{ padding: "5px 10px", fontSize: 11, flexShrink: 0 }} onClick={() => rollAttack(a)} title="Rolar ataque + dano">🎲</button>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", fontSize: 13, padding: "0 2px" }}>{expanded ? "▲" : "▼"}</button>
        <button onClick={() => rm(setAttacks)(i)} aria-label="Remover" style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
      </div>
      {expanded && (
        <div style={{ marginTop: 8, padding: 10, background: "rgba(0,0,0,0.3)", borderRadius: 4, border: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="op-label" style={{ fontSize: 8 }}>Nome</span>
              <input value={a.name || ""} onChange={(e) => upd(setAttacks)(i, { name: e.target.value })}
                style={{ padding: "4px 7px", fontSize: 13, fontFamily: "var(--font-title,'Cinzel',serif)", fontWeight: 600 }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="op-label" style={{ fontSize: 8 }}>Atributo de Teste</span>
              <select value={attrKey} onChange={(e) => upd(setAttacks)(i, { attr: e.target.value })} style={{ padding: "4px 7px", fontSize: 12, appearance: "auto" }}>
                {ATTR_KEYS.map(k => <option key={k} value={k}>{k} — {ATTR_LABELS[k]} ({attrs[k] ?? 0})</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            <LabeledMini label="Dano" value={a.dano || ""} onChange={(v) => upd(setAttacks)(i, { dano: v })} />
            <LabeledMini label="Crítico" value={a.critico || ""} onChange={(v) => upd(setAttacks)(i, { critico: v })} />
            <LabeledMini label="Tipo" value={a.tipo || ""} onChange={(v) => upd(setAttacks)(i, { tipo: v })} />
            <LabeledMini label="Alcance" value={a.alcance || ""} onChange={(v) => upd(setAttacks)(i, { alcance: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

function CombateTab({ diceRef, diceInput, setDiceInput, rollFree, attrs, rollAttr, attacks, setAttacks, rollAttack, upd, rm, add, rollCampaign, onOpenHistory }) {
  const [filter, setFilter] = useState("");
  const inputMini = { padding: "4px 7px", fontSize: 13, width: "100%" };
  const shown = attacks.filter((a) => (a.name || "").toLowerCase().includes(filter.toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── CONSOLE DE ROLAGEM ── */}
      <div className="op-ink" style={{ padding: "12px 13px", background: "rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span className="op-label" style={{ color: "var(--el-accent)" }}>Console de Rolagem</span>
          {rollCampaign && (
            <button onClick={onOpenHistory} className="op-hist-btn" title="Histórico de rolagens da campanha" aria-label="Abrir histórico da campanha">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              Histórico
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="op-data" style={{ color: "#4ade80", alignSelf: "center" }}>›</span>
          <input ref={diceRef} className="op-terminal" value={diceInput} placeholder="ex: 2d6+3, 1d20, 4d4-1"
            onChange={(e) => setDiceInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rollFree()} aria-label="Expressão de dados" />
          <button className="op-rolar" onClick={rollFree}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.4" fill="currentColor" /><circle cx="16" cy="16" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></svg>Rolar
          </button>
        </div>
      </div>

      {/* ── TESTES DE ATRIBUTO ── */}
      <div>
        <div className="op-label" style={{ marginBottom: 8 }}>Testes de Atributo</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7 }}>
          {ATTR_KEYS.map((k) => (
            <button key={k} className="op-attr-card" onClick={() => rollAttr(k)} aria-label={`Testar ${ATTR_LABELS[k]}`} title={`1d20 + ${ATTR_LABELS[k]}`}>
              <span className="op-attr-name">{k}</span>
              <span className="op-attr-val">{attrs[k] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ARSENAL ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
          <span className="op-label">Arsenal · {attacks.length}</span>
          <MiniBtn onClick={add(setAttacks, { name: "Nova arma", dano: "1d6", critico: "20", tipo: "", alcance: "Pessoal", attr: "FOR" })}>+ Novo</MiniBtn>
        </div>
        {attacks.length > 3 && (
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="🔍 filtrar ataques…"
            style={{ ...inputMini, marginBottom: 8, fontFamily: "var(--font-data,'Share Tech Mono',monospace)" }} />
        )}
        {attacks.length === 0 ? <Empty>Nenhum ataque registrado.</Empty> : shown.length === 0 ? <Empty>Nenhum ataque encontrado.</Empty> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {shown.map((a) => {
              const i = attacks.indexOf(a);
              return <ArsenalCard key={a.id || i} a={a} i={i} attrs={attrs} upd={upd} rm={rm} setAttacks={setAttacks} rollAttack={rollAttack} />;
            })}
          </div>
        )}
      </div>
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
