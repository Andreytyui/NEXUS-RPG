/* ════════════════════════════════════════════════════════════════════════
 *  ORDEM PARANORMAL — GAME RULES
 *  ------------------------------------------------------------------------
 *  Pure logic shared by the Ordem Paranormal sheet. Mirrors exactly the
 *  formulas already used by the legacy FullSheet in App.jsx so a character
 *  computes identically whichever sheet renders it (no data drift).
 * ════════════════════════════════════════════════════════════════════════ */

/* The five attributes, in display order. attrs object is keyed by these. */
export const ATTR_KEYS = ["AGI", "FOR", "INT", "PRE", "VIG"];
export const ATTR_LABELS = {
  AGI: "Agilidade",
  FOR: "Força",
  INT: "Intelecto",
  PRE: "Presença",
  VIG: "Vigor",
};

/* 28 perícias. Markers: '*' = só treinado · '+' = precisa de kit/treino p/ bônus. */
const RAW_PERICIAS = [
  { n: "Acrobacia+", attr: "AGI" }, { n: "Adestramento*", attr: "PRE" }, { n: "Artes*", attr: "PRE" },
  { n: "Atletismo", attr: "FOR" }, { n: "Atualidades", attr: "INT" }, { n: "Ciências*", attr: "INT" },
  { n: "Crime*+", attr: "AGI" }, { n: "Diplomacia", attr: "PRE" }, { n: "Enganação", attr: "PRE" },
  { n: "Fortitude", attr: "VIG" }, { n: "Furtividade+", attr: "AGI" }, { n: "Iniciativa", attr: "AGI" },
  { n: "Intimidação", attr: "PRE" }, { n: "Intuição", attr: "PRE" }, { n: "Investigação", attr: "INT" },
  { n: "Luta", attr: "FOR" }, { n: "Medicina*", attr: "INT" }, { n: "Ocultismo*", attr: "INT" },
  { n: "Percepção", attr: "PRE" }, { n: "Pilotagem*", attr: "AGI" }, { n: "Pontaria", attr: "AGI" },
  { n: "Profissão*", attr: "INT" }, { n: "Reflexos", attr: "AGI" }, { n: "Religião*", attr: "PRE" },
  { n: "Sobrevivência*", attr: "INT" }, { n: "Tática*", attr: "INT" }, { n: "Tecnologia*", attr: "INT" },
  { n: "Vontade", attr: "PRE" },
];

/* Collapsible category each perícia belongs to (center-panel grouping). */
const CATEGORIA = {
  Acrobacia: "gerais", Atletismo: "gerais", Crime: "gerais", Fortitude: "gerais", Furtividade: "gerais",
  Iniciativa: "gerais", Luta: "gerais", Pilotagem: "gerais", Pontaria: "gerais", Reflexos: "gerais", "Sobrevivência": "gerais",
  Atualidades: "tecnicas", "Ciências": "tecnicas", Medicina: "tecnicas", "Profissão": "tecnicas", Tecnologia: "tecnicas", "Tática": "tecnicas",
  Adestramento: "sociais", Artes: "sociais", Diplomacia: "sociais", "Enganação": "sociais", "Intimidação": "sociais",
  "Investigação": "paranormais", "Intuição": "paranormais", Ocultismo: "paranormais", "Percepção": "paranormais", "Religião": "paranormais", Vontade: "paranormais",
};

export const PERICIA_GRUPOS = [
  { id: "gerais", label: "Perícias Gerais" },
  { id: "tecnicas", label: "Perícias Técnicas" },
  { id: "sociais", label: "Perícias Sociais" },
  { id: "paranormais", label: "Perícias Paranormais" },
];

export const PERICIAS = RAW_PERICIAS.map((p) => {
  const base = p.n.replace(/[*+]/g, "");
  return {
    raw: p.n,
    base,
    attr: p.attr,
    onlyTrained: p.n.includes("*"),
    needsKit: p.n.includes("+"),
    categoria: CATEGORIA[base] || "gerais",
  };
});

/* Default trained perícias granted by origem + classe (matches FullSheet). */
export function defaultTrainedSet(origem, classe) {
  const byClass =
    classe?.id === "combatente"
      ? ["Luta", "Pontaria", "Iniciativa", "Atletismo", "Reflexos"]
      : classe?.id === "especialista"
      ? ["Investigação", "Ciências", "Tecnologia", "Percepção"]
      : ["Ocultismo", "Vontade", "Religião", "Intuição"];
  return new Set([
    ...((origem?.skills || []).map((s) => s.replace(/[*+]/g, ""))),
    ...byClass,
  ]);
}

/* Training degree → bonus and tier color. 0 destreinado · 5 treinado · 10 veterano · 15 expert */
export const TREINO_TIERS = {
  0: { label: "Destreinado", color: "var(--muted)" },
  5: { label: "Treinado", color: "#4ade80" },
  10: { label: "Veterano", color: "#60a5fa" },
  15: { label: "Expert", color: "var(--gold2)" },
};
export const treinoColor = (v) =>
  v >= 15 ? "var(--gold2)" : v >= 10 ? "#60a5fa" : v >= 5 ? "#4ade80" : "var(--muted)";

/* NEX level (5..99) → character "level" (0..19). 99% = level 19. */
export const nexLevel = (nex) => (nex === 99 ? 19 : (nex - 5) / 5);

/* Max PV / SAN / PE at a given NEX for a class (identical to App.jsx nexStats). */
export function nexStats(nexVal, classId, attrs) {
  const base = {
    combatente: { pv: 20 + attrs.VIG, san: 12, pe: 2 + attrs.PRE },
    especialista: { pv: 16 + attrs.VIG, san: 16, pe: 3 + attrs.PRE },
    ocultista: { pv: 12 + attrs.VIG, san: 20, pe: 4 + attrs.PRE },
  }[classId] ?? { pv: 12 + attrs.VIG, san: 20, pe: 4 + attrs.PRE };
  const perNex = {
    combatente: { pv: 4 + attrs.VIG, san: 3, pe: 2 + attrs.PRE },
    especialista: { pv: 3 + attrs.VIG, san: 4, pe: 3 + attrs.PRE },
    ocultista: { pv: 2 + attrs.VIG, san: 5, pe: 4 + attrs.PRE },
  }[classId] ?? { pv: 2 + attrs.VIG, san: 5, pe: 4 + attrs.PRE };
  const lvl = nexLevel(nexVal);
  return {
    pv: base.pv + lvl * perNex.pv,
    san: base.san + lvl * perNex.san,
    pe: base.pe + lvl * perNex.pe,
  };
}

/* Derived combat readouts (matches FullSheet). */
export function deriveStats(attrs, nex) {
  return {
    defesa: 10 + attrs.AGI,
    esquiva: attrs.AGI,
    bloqueio: 0,
    peTurno: 1 + nexLevel(nex),
    deslocamento: `${6 + attrs.AGI}m / ${4 + attrs.AGI}q`,
  };
}

/*
 * Ordem Paranormal d20 test: roll N d20 (N = attribute, min handling for 0),
 * keep the best (or worst when the attribute is 0). Identical to App.jsx rollOP.
 */
export function rollOP(attrVal) {
  const n = attrVal === 0 ? 2 : attrVal;
  const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * 20) + 1);
  const result = attrVal === 0 ? Math.min(...rolls) : Math.max(...rolls);
  return { rolls, result, worst: attrVal === 0, crit: rolls.includes(20), dice: "D20" };
}

/* Parse + roll a free expression like "2d6+3" / "1d20" / "d100-5". */
export function rollExpr(expr) {
  const m = String(expr).replace(/\s/g, "").match(/^(\d+)?[dD](\d+)([+-]\d+)?$/);
  if (!m) return null;
  const count = Math.min(parseInt(m[1] || "1", 10), 30);
  const sides = parseInt(m[2], 10);
  const mod = m[3] ? parseInt(m[3], 10) : 0;
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const sum = rolls.reduce((a, b) => a + b, 0) + mod;
  return {
    rolls,
    result: sum,
    mod,
    sides,
    count,
    crit: sides === 20 && rolls.includes(20),
    dice: `D${sides}`,
  };
}

/*
 * NEX clearance ladder (5% → 99%) for the progression matrix modal.
 * Tiers are decorative "classified clearance" bands; abilities note generic
 * Ordem milestones (full per-class trees come from the character's trilha).
 */
export const NEX_LADDER = [
  { nex: 5, tier: "INICIANTE", note: "Primeiro contato com o Paranormal. Poder de classe inicial." },
  { nex: 10, tier: "INICIANTE", note: "Habilidade de classe." },
  { nex: 15, tier: "OPERACIONAL", note: "Poder de trilha. 1º elemento de afinidade." },
  { nex: 20, tier: "OPERACIONAL", note: "Habilidade de classe. Aumento de atributo." },
  { nex: 25, tier: "OPERACIONAL", note: "Poder paranormal / de classe." },
  { nex: 30, tier: "VETERANO", note: "Poder de trilha. Resistência ampliada." },
  { nex: 35, tier: "VETERANO", note: "Grau de treinamento (5+INT perícias)." },
  { nex: 40, tier: "VETERANO", note: "Habilidade de classe. Aumento de atributo." },
  { nex: 45, tier: "VETERANO", note: "Poder paranormal." },
  { nex: 50, tier: "ESPECIAL", note: "Poder de trilha. Marco de meio-caminho." },
  { nex: 55, tier: "ESPECIAL", note: "Poder de classe." },
  { nex: 60, tier: "ESPECIAL", note: "Aumento de atributo." },
  { nex: 65, tier: "ESPECIAL", note: "Poder paranormal." },
  { nex: 70, tier: "CRÍTICO", note: "Poder de trilha. Grau de treinamento." },
  { nex: 75, tier: "CRÍTICO", note: "Habilidade de classe." },
  { nex: 80, tier: "CRÍTICO", note: "Aumento de atributo." },
  { nex: 85, tier: "CRÍTICO", note: "Poder paranormal." },
  { nex: 90, tier: "MÁXIMO", note: "Poder de trilha. Limiar do Outro Lado." },
  { nex: 95, tier: "MÁXIMO", note: "Habilidade de classe suprema." },
  { nex: 99, tier: "TRANSCENDENTE", note: "Convergência total. Agente lendário." },
];

/* Format a roll for the campaign feed / onRoll bridge (matches App handleRoll). */
export function rollPayload(label, res, charName) {
  return {
    attr: label,
    expr: res.expr || label,
    rolls: res.rolls,
    result: res.result,
    dice: res.dice || "D20",
    crit: !!res.crit,
    worst: !!res.worst,
    charName,
  };
}
