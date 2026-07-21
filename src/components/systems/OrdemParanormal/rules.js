/* ════════════════════════════════════════════════════════════════════════
 *  ORDEM PARANORMAL — GAME RULES
 *  ------------------------------------------------------------------------
 *  Pure logic shared by the Ordem Paranormal sheet. Fórmulas conferidas
 *  contra o livro oficial (spec 0006) — deslocamento, DT de rituais e
 *  patentes NÃO espelham mais o FullSheet legado do App.jsx.
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

/* Derived combat readouts (matches FullSheet).
 * NOTE: a ficha (OrdemParanormalSheet) recalcula Defesa/Esquiva/Deslocamento com os
 * bônus e o homebrew do Cellbit (Esquiva = 10+AGI+Reflexos). Aqui só sobra o que ela
 * de fato consome — `peTurno`. Os campos esquiva/bloqueio mortos foram removidos
 * (assessment-0021 §A). Defesa/deslocamento ficam por estarem cobertos por teste. */
export function deriveStats(attrs, nex) {
  return {
    defesa: 10 + attrs.AGI,
    peTurno: 1 + nexLevel(nex),
    deslocamento: "9m / 6q",
  };
}

/* Sobrecarga (oficial): o teto ABSOLUTO de carga é 2× a carga máxima — acima disso o
 * personagem não consegue carregar mais nada. Entre `cargaMaxima` e o teto ele está
 * sobrecarregado (-5 em Atletismo/Furtividade, -3m de deslocamento). */
export const cargaTeto = (attrs) => 2 * cargaMaxima(attrs);

/* Maior círculo de ritual que o NEX permite aprender (oficial, via assessment-0021 §A):
 * 1º=5%, 2º=25%, 3º=55%, 4º=85%. Usado só para AVISO visual — não trava (decisão Andre). */
export const circuloMaxNex = (nex) =>
  nex >= 85 ? 4 : nex >= 55 ? 3 : nex >= 25 ? 2 : nex >= 5 ? 1 : 0;

/* DT para resistir aos seus rituais (oficial): 10 + NEX/5 + Presença (+ bônus da ficha). */
export function dtRituais(nex, attrs, bonus = 0) {
  return 10 + (nexLevel(nex) + 1) + (attrs?.PRE || 0) + bonus;
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

/* ── Arsenal v2 (spec 0020) ─────────────────────────────────────────────── */

/* Tipos de dano oficiais de Ordem Paranormal (para o dropdown do editor de ataque). */
export const TIPOS_DANO = [
  "Balístico", "Corte", "Impacto", "Perfuração", "Fogo", "Frio", "Eletricidade",
  "Químico", "Mental", "Medo", "Morte", "Sangue", "Energia", "Conhecimento",
];

/* Alcances comuns (dropdown com opção livre). */
export const ALCANCES = ["Pessoal", "Toque", "Curto", "Médio", "Longo", "Extremo"];

/* Perícias de ataque + o atributo puro, para o dropdown de Perícia do ataque. */
export const PERICIAS_ATAQUE = ["Luta", "Pontaria", "FOR", "AGI", "INT", "PRE", "VIG"];

/**
 * Margem de ameaça: menor resultado no d20 que ainda é crítico.
 * Aceita "20", "19", "19-20", "19+"… → o menor número; default 20; clamp [2,20].
 */
export function critMargin(critico) {
  const m = String(critico ?? "20").match(/\d+/g);
  if (!m) return 20;
  const n = Math.min(...m.map(Number));
  return Math.min(20, Math.max(2, n));
}

/** O d20 MANTIDO (maior) é crítico se atingiu a margem de ameaça. */
export function isCritical(keptDie, critico) {
  return Number(keptDie) >= critMargin(critico);
}

/**
 * Combina o dano de um ataque (spec 0020 AC-2/AC-3). Recebe números JÁ rolados
 * (pureza/testabilidade). No crítico, o dano BASE é multiplicado pelo multiplicador;
 * o dano extra NÃO é multiplicado (dano adicional de efeito, padrão OP). Retorna o
 * total e o breakdown por tipo.
 * @param {number} base       dano base já rolado (inclui atributo de dano)
 * @param {number} mult       multiplicador de crítico (default 2)
 * @param {boolean} isCrit
 * @param {Array<{result:number,tipo?:string}>} extras  danos extra já rolados
 * @param {string} mainType   tipo do dano base
 */
export function combineDamage(base, mult, isCrit, extras = [], mainType = "") {
  const m = Number(mult) > 1 ? Math.floor(Number(mult)) : 2;
  const b = Math.max(0, Math.round(Number(base) || 0));
  const mainTotal = isCrit ? b * m : b;
  const byType = {};
  const addType = (tp, v) => { const k = tp || "—"; byType[k] = (byType[k] || 0) + v; };
  addType(mainType, mainTotal);
  let total = mainTotal;
  for (const e of extras || []) {
    const v = Math.max(0, Math.round(Number(e && e.result) || 0));
    if (!v) continue;
    total += v;
    addType(e.tipo, v);
  }
  return { total, byType };
}

/*
 * NEX clearance ladder (5% → 99%) for the progression matrix modal.
 * Tiers are decorative "classified clearance" bands; abilities note generic
 * Ordem milestones (full per-class trees come from the character's trilha).
 */
export const NEX_LADDER = [
  { nex: 5, tier: "INICIANTE", note: "Primeiro contato com o Paranormal. Poder de classe inicial." },
  { nex: 10, tier: "INICIANTE", note: "Habilidade de trilha (1º poder)." },
  { nex: 15, tier: "OPERACIONAL", note: "Poder de classe." },
  { nex: 20, tier: "OPERACIONAL", note: "Aumento de atributo." },
  { nex: 25, tier: "OPERACIONAL", note: "Marco de classe (ex.: rituais de 2º círculo para Ocultista)." },
  { nex: 30, tier: "VETERANO", note: "Poder de classe." },
  { nex: 35, tier: "VETERANO", note: "Grau de treinamento (5+INT perícias)." },
  { nex: 40, tier: "VETERANO", note: "Habilidade de trilha (2º poder)." },
  { nex: 45, tier: "VETERANO", note: "Poder de classe." },
  { nex: 50, tier: "ESPECIAL", note: "Aumento de atributo. Versatilidade. Afinidade elemental (escolha do elemento)." },
  { nex: 55, tier: "ESPECIAL", note: "Marco de classe (ex.: rituais de 3º círculo para Ocultista)." },
  { nex: 60, tier: "ESPECIAL", note: "Poder de classe." },
  { nex: 65, tier: "ESPECIAL", note: "Habilidade de trilha (3º poder)." },
  { nex: 70, tier: "CRÍTICO", note: "Grau de treinamento (5+INT perícias)." },
  { nex: 75, tier: "CRÍTICO", note: "Poder de classe." },
  { nex: 80, tier: "CRÍTICO", note: "Aumento de atributo." },
  { nex: 85, tier: "CRÍTICO", note: "Marco de classe (ex.: rituais de 4º círculo para Ocultista)." },
  { nex: 90, tier: "MÁXIMO", note: "Poder de classe. Limiar do Outro Lado." },
  { nex: 95, tier: "MÁXIMO", note: "Aumento de atributo." },
  { nex: 99, tier: "TRANSCENDENTE", note: "Habilidade de trilha (4º e último poder). Agente lendário." },
];

/* ── Classes ── */
export const CLASSES_OP = [
  { id:"combatente",  name:"Combatente",  icon:"⚔️", bonus:"PV +4 · Ataque +2 · Resistência Física" },
  { id:"especialista",name:"Especialista",icon:"🔬", bonus:"PE +4 · Perícia +2 · Conhecimento Amplo" },
  { id:"ocultista",   name:"Ocultista",   icon:"🌀", bonus:"SAN +4 · Rituais +2 · Afinidade Paranormal" },
];

/* ── Poderes nomeados por classe (escolhidos em marcos de NEX) ── */
export const CLASS_POWERS = {
  combatente: [
    {id:"arm_pesado",      name:"Armamento Pesado",       cost:"—",    desc:"Você tem proficiência com todas as armas pesadas. Ao usar armas pesadas, recebe +2 na margem de ameaça."},
    {id:"artista_marcial", name:"Artista Marcial",         cost:"—",    desc:"Seus ataques desarmados causam 1d6 de dano e são considerados letais. Você pode usar AGI no lugar de FOR em ataques desarmados."},
    {id:"atq_oportunidade",name:"Ataque de Oportunidade",  cost:"reação",desc:"Quando um inimigo adjacente se afasta sem se esquivar, você pode atacá-lo como reação."},
    {id:"atq_giratorio",   name:"Ataque Giratório",        cost:"2 PE", desc:"Faça um ataque corpo a corpo contra todos os inimigos adjacentes. Role o dano separadamente para cada um."},
    {id:"bloqueio",        name:"Bloqueio",                cost:"reação",desc:"Quando receber um ataque corpo a corpo, você pode gastar uma reação para reduzir o dano em 1d8 + FOR."},
    {id:"comb_defensivo",  name:"Combate Defensivo",       cost:"—",    desc:"Declare antes de agir. Você recebe −2 nos ataques, mas +5 na Defesa até o próximo turno."},
    {id:"esquiva_melh",    name:"Esquiva Aprimorada",      cost:"—",    desc:"Você recebe +2 na Defesa e pode usar Esquiva mesmo usando armaduras pesadas."},
    {id:"golpe_brutal",    name:"Golpe Brutal",            cost:"2 PE", desc:"Ao acertar um ataque corpo a corpo, role os dados de dano duas vezes e escolha o maior resultado."},
    {id:"segundo_ataque",  name:"Segundo Ataque",          cost:"—",    desc:"Quando usa a ação Ataque, você pode fazer um segundo ataque com −5 no teste."},
    {id:"provocar",        name:"Provocar",                cost:"1 PE", desc:"Teste de Intimidação vs. Vontade do alvo. Se vencer, o alvo fica com desvantagem em ataques contra quem não seja você até o fim do seu próximo turno."},
    {id:"armas_duplas",    name:"Combate com Duas Armas",  cost:"—",    desc:"Ao atacar com uma arma leve na mão principal, você pode atacar com outra arma leve na mão secundária como ação livre com −2 no teste."},
    {id:"resistencia_fis", name:"Resistência Física",      cost:"—",    desc:"Você ganha resistência a dano físico (balístico e corte/impacto) igual à metade do seu valor de VIG."},
    {id:"vigor_combate",   name:"Vigor de Combate",        cost:"—",    desc:"Ao reduzir um inimigo a 0 PV, você recupera PE igual ao NEX/10 (mínimo 1)."},
    {id:"investida",       name:"Investida",               cost:"1 PE", desc:"Mova-se até o seu deslocamento em linha reta e faça um ataque com +2, causando +1d6 de dano se mover ao menos 6m."},
    {id:"fortif_posicao",  name:"Fortif. de Posição",      cost:"—",    desc:"Enquanto não se mover no seu turno, recebe +3 na Defesa e vantagem em testes de Fortitude."},
  ],
  especialista: [
    {id:"analise_rapida",  name:"Análise Rápida",          cost:"—",    desc:"Uma vez por cena, use uma ação livre para analisar um oponente. Descubra um de seus atributos, poderes especiais ou fraquezas."},
    {id:"contatos",        name:"Contatos",                cost:"—",    desc:"Você mantém uma rede de contatos. Uma vez por sessão, pode pedir um favor a um contato: informações, equipamento ou acesso."},
    {id:"desarmar",        name:"Desarmar",                cost:"1 PE", desc:"Faça um teste de Luta ou Pontaria vs. Reflexos do alvo. Se vencer, o alvo solta o objeto que carregava na mão."},
    {id:"esquiva_experto", name:"Esquiva de Experto",      cost:"reação",desc:"Quando seria atingido por um ataque, role Reflexos vs. o ataque. Se vencer, anule o dano completamente."},
    {id:"exp_forense",     name:"Expertise Forense",       cost:"—",    desc:"Você tem vantagem em testes de Investigação e Medicina ao analisar cenas de crime, corpos e evidências físicas."},
    {id:"furtividade_urb", name:"Furtividade Urbana",      cost:"—",    desc:"Em ambientes urbanos, você pode se mover furtivamente sem penalidade mesmo em plena luz do dia."},
    {id:"hacker",          name:"Hacker",                  cost:"—",    desc:"Você pode usar Tecnologia para invadir sistemas. Sistemas comuns não requerem teste; sistemas protegidos exigem teste oposto."},
    {id:"improviso",       name:"Improviso",               cost:"2 PE", desc:"Crie um objeto simples do ambiente (armadilha, arma, escudo) com uma ação padrão. O objeto dura até o fim da cena."},
    {id:"lider_nato",      name:"Líder Nato",              cost:"—",    desc:"Aliados que possam ouvir você recebem +1 em todos os testes enquanto estiverem sob sua liderança ativa."},
    {id:"macete",          name:"Macete",                  cost:"—",    desc:"Escolha uma perícia treinada. Você pode usá-la como se tivesse um grau a mais de treinamento."},
    {id:"multipericia",    name:"Multiperícia",            cost:"—",    desc:"Escolha três perícias em que não seja treinado. Você passa a ser treinado nelas."},
    {id:"preparado",       name:"Preparado",               cost:"—",    desc:"No início de cada cena, você pode preparar uma ação que será executada como reação quando uma condição específica for cumprida."},
    {id:"rec_intel",       name:"Reconhecimento Inteligente",cost:"—",  desc:"Ao entrar em um local novo, pode usar uma ação livre para obter informações básicas sobre o ambiente e ameaças."},
    {id:"suporte_tatico",  name:"Suporte Tático",          cost:"2 PE", desc:"Use uma ação padrão para coordenar aliados. Até (INT) aliados recebem vantagem em seus próximos testes até o fim do turno."},
    {id:"vigilancia",      name:"Vigilância",              cost:"—",    desc:"Você não pode ser surpreendido. Mesmo dormindo, efetua testes de Percepção com metade do bônus."},
  ],
  ocultista: [
    {id:"bnd_mental",      name:"Blindagem Mental",        cost:"2 PE", desc:"Use uma ação livre para criar uma barreira mental. Até o fim do próximo turno, você tem vantagem em testes contra efeitos mentais."},
    {id:"canal_para",      name:"Canal Paranormal",        cost:"—",    desc:"Uma vez por cena, reduza o custo em PE de um ritual em 2 (mínimo 0)."},
    {id:"conhec_oculto",   name:"Conhecimento Oculto",     cost:"—",    desc:"Você tem vantagem em testes de Ocultismo e pode identificar entidades, rituais e efeitos paranormais automaticamente."},
    {id:"detectar_para",   name:"Detectar Paranormal",     cost:"1 PE", desc:"Use uma ação padrão para sentir manifestações paranormais em alcance médio. Recebe informações sobre a natureza e intensidade do fenômeno."},
    {id:"dom_elemento",    name:"Dom do Elemento",         cost:"—",    desc:"Ao escolher seu elemento de afinidade, você recebe +2 na DT dos seus rituais daquele elemento."},
    {id:"empatia_para",    name:"Empatia Paranormal",      cost:"—",    desc:"Você pode sentir as emoções de entidades paranormais. Tem vantagem em interagir com elas social e taticamente."},
    {id:"escudo_ritual",   name:"Escudo Ritual",           cost:"3 PE", desc:"Use uma ação de movimento para criar um escudo de energia ritual. Recebe +3 na Defesa até o início do próximo turno."},
    {id:"exorcismo",       name:"Exorcismo",               cost:"4 PE", desc:"Use uma ação completa para tentar expulsar uma entidade possuindo um alvo. Faça teste de Ocultismo vs. Vontade da entidade."},
    {id:"foco_ritual",     name:"Foco Ritual",             cost:"—",    desc:"Você pode usar um objeto especial como foco. Ao lançar rituais com o foco, ignora o componente de gestos ou palavras."},
    {id:"mem_ritual",      name:"Memória Ritual",          cost:"—",    desc:"Você pode memorizar rituais adicionais. Seu limite de rituais conhecidos aumenta em 2."},
    {id:"projecao_astral", name:"Projeção Astral",         cost:"5 PE", desc:"Uma vez por sessão, projete sua consciência para o Outro Lado por até (INT) minutos. Seu corpo fica vulnerável durante esse tempo."},
    {id:"purificacao",     name:"Purificação",             cost:"3 PE", desc:"Remova um efeito paranormal negativo de si mesmo ou de um aliado adjacente. Funciona com efeitos de até 3° círculo."},
    {id:"res_paranormal",  name:"Resistência Paranormal",  cost:"—",    desc:"Você tem resistência a dano paranormal igual ao dobro do seu INT e vantagem em testes contra efeitos do Outro Lado."},
    {id:"voz_outro_lado",  name:"Voz do Outro Lado",       cost:"2 PE", desc:"Comunique-se com entidades paranormais próximas como ação padrão, mesmo sem rituais. Elas podem optar por não responder."},
    {id:"wards",           name:"Wards Protetoras",        cost:"3 PE", desc:"Gaste 10 minutos para criar uma ward em um local. Qualquer entidade paranormal que entrar deve passar em Vontade (DT 8+NEX/10) ou ser repelida."},
  ],
};

/* ── Trilhas por classe ── */
export const CLASS_TRAILS = {
  combatente:  [
    {id:"aniquilador",  name:"Aniquilador"},
    {id:"comandante",   name:"Comandante de Campo"},
    {id:"guerreiro",    name:"Guerreiro"},
    {id:"op_especiais", name:"Operações Especiais"},
    {id:"tropa_choque", name:"Tropa de Choque"},
  ],
  especialista:[{id:"atirador_e",name:"Atirador de Elite"},{id:"medico",name:"Médico de Campo"},{id:"negociador",name:"Negociador"}],
  ocultista:   [
    {id:"conduite",    name:"Conduíte"},
    {id:"flagelador",  name:"Flagelador"},
    {id:"graduado",    name:"Graduado"},
    {id:"intuitivo",   name:"Intuitivo"},
    {id:"lamina_para", name:"Lâmina Paranormal"},
  ],
};

/* ── Poderes de Trilha (NEX 10/40/65/99) ── */
export const TRAIL_ABILITIES = {
  aniquilador:{
    10:{name:"Ataque Poderoso",  cost:"—",    desc:"Você pode aceitar −2 no teste de ataque para receber +1d10 na rolagem de dano com armas corpo a corpo ou pesadas."},
    40:{name:"Destruidor",       cost:"2 PE", desc:"Ao acertar um ataque, gaste 2 PE para ignorar a resistência a dano físico do alvo. O dano não pode ser reduzido por nenhum meio."},
    65:{name:"Incontível",       cost:"—",    desc:"Você não pode ser imobilizado, agarrado ou derrubado involuntariamente. Se sofrer essas condições, remove-as como ação livre."},
    99:{name:"Força Bruta",      cost:"5 PE", desc:"Uma vez por cena, declare Força Bruta antes de atacar. O ataque acerta automaticamente e causa o dano máximo possível, ignorando todas as resistências."},
  },
  comandante:{
    10:{name:"Inspirar Confiança",cost:"2 PE (reação)",desc:"Faça um aliado em alcance curto rolar novamente um teste recém realizado, usando o melhor resultado."},
    40:{name:"Estrategista",      cost:"1 PE/aliado",  desc:"Use uma ação padrão para coordenar aliados (máximo INT). No próximo turno, cada aliado coordenado ganha uma ação de movimento adicional."},
    65:{name:"Brecha na Guarda",  cost:"2 PE (reação)",desc:"Quando um aliado acerta um inimigo em alcance curto, você ou outro aliado pode imediatamente fazer um ataque gratuito contra esse mesmo inimigo."},
    99:{name:"Oficial Comandante",cost:"5 PE",         desc:"Cada aliado em alcance médio recebe uma ação padrão adicional no próximo turno. Eles podem usá-la apenas para atacar ou se mover."},
  },
  guerreiro:{
    10:{name:"Técnica Letal",   cost:"—",            desc:"+2 na margem de ameaça com todos os ataques corpo a corpo. Quando ameaça crítico, rola dano duas vezes e escolhe o maior."},
    40:{name:"Revidar",         cost:"2 PE (reação)", desc:"Sempre que bloquear ou esquivar de um ataque com sucesso, faça imediatamente um ataque corpo a corpo no inimigo que o atacou."},
    65:{name:"Força Opressora", cost:"1 PE",          desc:"Quando acerta um ataque corpo a corpo, realize uma manobra derrubar ou empurrar como ação livre sem teste oposto."},
    99:{name:"Potência Máxima", cost:"—",             desc:"Quando usa Ataque Especial com armas corpo a corpo, todos os dados de dano são considerados o resultado máximo possível."},
  },
  op_especiais:{
    10:{name:"Furtividade Tática", cost:"—",    desc:"Você pode se mover à velocidade total sem penalidade em testes de Furtividade. Quando ataca de surpresa, causa +2d6 de dano."},
    40:{name:"Ponto Fraco",        cost:"2 PE", desc:"Uma vez por rodada, ao acertar um ataque, gaste 2 PE para causar dano adicional igual ao seu valor de Agilidade e reduzir a Defesa do alvo em 2 até o fim da rodada."},
    65:{name:"Execução",           cost:"3 PE", desc:"Contra um alvo com metade ou menos de seus PV máximos, gaste 3 PE para que seu ataque cause o dobro do dano total."},
    99:{name:"Fantasma",           cost:"5 PE", desc:"Uma vez por cena, torne-se invisível por até 1 minuto. Ataques enquanto invisível acertam automaticamente e causam dano máximo."},
  },
  tropa_choque:{
    10:{name:"Resistência Tática", cost:"—",            desc:"Você recebe resistência a dano físico (balístico, cortante, contundente) igual à metade do seu valor de Vigor (mínimo 1)."},
    40:{name:"Escudo Humano",      cost:"2 PE (reação)", desc:"Quando um aliado adjacente for alvo de um ataque, use sua reação para interpor-se. Você recebe o dano no lugar do aliado."},
    65:{name:"Obstáculo",          cost:"1 PE",          desc:"Inimigos que se movam através do seu alcance corpo a corpo devem passar em Atletismo (DT 10 + seu VIG) ou param o movimento."},
    99:{name:"Fortaleza",          cost:"—",             desc:"Seu valor máximo de PV aumenta em 20. Quando reduzido a 0 PV, você pode, uma vez por cena, continuar agindo com 1 PV por mais uma rodada."},
  },
  atirador_e:{
    10:{name:"Foco Total",       cost:"—",     desc:"Quando usa a ação mirar, você recebe +5 no teste de ataque e +1d6 na rolagem de dano."},
    40:{name:"Execução",         cost:"—",     desc:"Se um alvo está inconsciente ou não sabe que você está lá, seu ataque causa dano máximo."},
    65:{name:"Tiro Perfurante",  cost:"—",     desc:"Seus ataques com armas de fogo podem atingir todos os alvos em linha reta no alcance da arma."},
    99:{name:"Sniper Lendário",  cost:"5 PE",  desc:"Uma vez por cena, faça um ataque que ignora todos os bônus de Defesa, resistência e cobertura do alvo."},
  },
  medico:{
    10:{name:"Paramédico",      cost:"2 PE",   desc:"Use uma ação padrão e 2 PE para curar 2d10 PV de si mesmo ou de um aliado adjacente."},
    40:{name:"Equipe de Trauma",cost:"2 PE",   desc:"Use uma ação padrão e 2 PE para remover uma condição negativa (exceto morrendo) de um aliado adjacente."},
    65:{name:"Resgate",         cost:"—",      desc:"Uma vez por rodada, se em alcance curto de aliado machucado ou morrendo, aproxime-se como ação livre. Ao curar, você e o aliado recebem +5 na Defesa até o próximo turno."},
    99:{name:"Reanimação",      cost:"10 PE",  desc:"Uma vez por cena, gaste uma ação completa e 10 PE para trazer de volta à vida um personagem que morreu na mesma cena (exceto dano massivo)."},
  },
  negociador:{
    10:{name:"Eloquência",          cost:"1 PE/alvo",desc:"Use uma ação completa e 1 PE por alvo para afetá-los com sua fala. Faça Diplomacia, Enganação ou Intimidação contra a Vontade deles."},
    40:{name:"Persuasão Profunda",  cost:"—",       desc:"Quando usa Eloquência e vence por 10 ou mais, o alvo fica sob efeito por toda a cena."},
    65:{name:"Psicologia Aplicada", cost:"3 PE",    desc:"Uma vez por cena, teste de Intuição (DT 15) para descobrir uma fraqueza ou motivação. Receba +5 em testes de Presença contra esse personagem."},
    99:{name:"Mestre das Palavras", cost:"—",       desc:"Você pode usar Eloquência como ação padrão. Aliados em alcance curto recebem +5 em testes de Presença."},
  },
  conduite:{
    10:{name:"Ampliar Ritual",    cost:"2 PE",    desc:"Ao lançar um ritual, gaste 2 PE para aumentar seu efeito em 50% — dano, cura, duração ou área afetada."},
    40:{name:"Acelerar Ritual",   cost:"3 PE",    desc:"Reduza a execução de um ritual em uma categoria (longa→completa→padrão→livre). Gaste 3 PE ao declarar a aceleração."},
    65:{name:"Anular Ritual",     cost:"4 PE (reação)",desc:"Quando um ritual for lançado em alcance médio, use sua reação e gaste 4 PE para realizar um teste de Ocultismo oposto. Se vencer, o ritual é anulado sem efeito."},
    99:{name:"Canalizar o Medo", cost:"5 PE",    desc:"Uma vez por cena, canaliza o pavor coletivo em alcance médio. Todos os inimigos que falharem em Vontade (DT 8 + NEX/10) ficam Abalados e sofrem 4d10 de dano paranormal."},
  },
  flagelador:{
    10:{name:"Aura de Sofrimento",cost:"2 PE",   desc:"Ative como ação livre. Inimigos que iniciarem o turno adjacentes a você devem passar em Fortitude (DT 10 + PRE) ou sofrem 1d6 de dano paranormal e ficam com −1 em todos os testes até o fim da rodada."},
    40:{name:"Açoite Paranormal", cost:"2 PE",   desc:"Ataque paranormal em alcance médio: teste de Ocultismo vs. Reflexos do alvo. Se acertar, causa 2d8 de dano paranormal e o alvo perde sua próxima ação de movimento."},
    65:{name:"Punição Ritualística",cost:"3 PE", desc:"Ao causar dano paranormal em um alvo, você pode gastar 3 PE para que ele sofra o mesmo valor de dano novamente no início do próximo turno, sem direito a resistência."},
    99:{name:"Terror Encarnado",  cost:"5 PE",   desc:"Uma vez por cena, manifeste o terror do Outro Lado. Todos os inimigos em alcance curto devem passar em Vontade (DT 8 + PRE) ou ficam Apavorados por 3 rodadas e sofrem 3d10 de dano paranormal."},
  },
  graduado:{
    10:{name:"Saber Ampliado",       cost:"—", desc:"Aprenda um ritual de 1° círculo adicional. Toda vez que ganha acesso a um novo círculo, aprende um ritual adicional daquele círculo."},
    40:{name:"Grimório Ritualístico", cost:"—", desc:"Crie um grimório especial. Aprenda rituais de 1° ou 2° círculos iguais ao seu INT. O grimório ocupa 1 espaço no inventário."},
    65:{name:"Rituais Eficientes",    cost:"—", desc:"A DT para resistir a todos os seus rituais aumenta em +5."},
    99:{name:"Conhecendo o Medo",     cost:"—", desc:"Você aprende o ritual Conhecendo o Medo."},
  },
  intuitivo:{
    10:{name:"Mente Sã",       cost:"—",    desc:"Você recebe resistência paranormal +5 (+5 em testes de resistência contra efeitos paranormais)."},
    40:{name:"Barreira Mental", cost:"—",   desc:"Quando passa em um teste de resistência contra efeito paranormal, recupera 1d6 de Sanidade."},
    65:{name:"Vontade de Ferro",cost:"2 PE",desc:"Role novamente um teste de resistência contra efeito paranormal. Seu valor máximo de Sanidade aumenta em 10."},
    99:{name:"Além do Alcance", cost:"—",  desc:"Imune a efeitos de medo paranormal e sua Sanidade não pode ser reduzida abaixo de 1 por efeitos paranormais."},
  },
  lamina_para:{
    10:{name:"Lâmina de Éter",      cost:"1 PE",  desc:"Manifeste uma lâmina de energia paranormal. Ela causa 1d8 de dano paranormal, usa PRE no lugar de FOR nos testes de ataque e ignora armaduras não-mágicas."},
    40:{name:"Golpe Ritual",         cost:"2 PE",  desc:"Ao acertar com a Lâmina de Éter, gaste 2 PE para infundir um ritual de 1° círculo no golpe, aplicando seu efeito ao alvo automaticamente (sem teste oposto)."},
    65:{name:"Corte Dimensional",    cost:"3 PE",  desc:"Seu ataque com a Lâmina de Éter atravessa dimensões — ignora cobertura, resistência física e pode atingir alvos etéreos ou invisíveis."},
    99:{name:"Execução Paranormal",  cost:"5 PE",  desc:"Uma vez por cena, declare antes de atacar. Se acertar, o alvo sofre dano máximo da Lâmina de Éter mais 5d10 de dano paranormal e deve passar em Fortitude (DT 8 + PRE) ou cair inconsciente."},
  },
};

/* ── Progressão Base por Classe (não-trilha) ── */
export const CLASS_BASE_ABILITIES = {
  combatente:[
    {nex:5,  name:"Ataque Especial",    cost:"2 PE",  desc:"Quando faz um ataque, gaste 2 PE para receber +5 no teste de ataque ou na rolagem de dano."},
    {nex:10, name:"Habilidade de Trilha",cost:"—",   desc:"Escolha uma trilha de Combatente e receba seu 1° poder.", isTrilhaMark:true},
    {nex:15, name:"Poder de Combatente",cost:"—",    desc:"Escolha um poder de combatente da lista."},
    {nex:20, name:"Aumento de Atributo",cost:"—",    desc:"Aumente um atributo à sua escolha em +1 (máximo 5)."},
    {nex:25, name:"Ataque Especial ↑",  cost:"3 PE", desc:"Gaste 3 PE para receber +10 no ataque ou dano."},
    {nex:30, name:"Poder de Combatente",cost:"—",    desc:"Escolha um poder de combatente da lista."},
    {nex:35, name:"Grau de Treinamento",cost:"—",    desc:"Escolha (5+INT) perícias treinadas; seu grau de treinamento nelas aumenta em um."},
    {nex:40, name:"Habilidade de Trilha",cost:"—",  desc:"Receba o 2° poder da sua trilha de Combatente.", isTrilhaMark:true},
    {nex:45, name:"Poder de Combatente",cost:"—",    desc:"Escolha um poder de combatente da lista."},
    {nex:50, name:"Aumento de Atributo",cost:"—",    desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:50, name:"Versatilidade",      cost:"—",    desc:"Escolha um poder de combatente ou o 1° poder de uma trilha que não a sua."},
    {nex:55, name:"Ataque Especial ↑",  cost:"4 PE", desc:"Gaste 4 PE para receber +15 no ataque ou dano."},
    {nex:60, name:"Poder de Combatente",cost:"—",    desc:"Escolha um poder de combatente da lista."},
    {nex:65, name:"Habilidade de Trilha",cost:"—",  desc:"Receba o 3° poder da sua trilha de Combatente.", isTrilhaMark:true},
    {nex:70, name:"Grau de Treinamento",cost:"—",    desc:"Escolha (5+INT) perícias treinadas; grau de treinamento aumenta em um."},
    {nex:75, name:"Poder de Combatente",cost:"—",    desc:"Escolha um poder de combatente da lista."},
    {nex:80, name:"Aumento de Atributo",cost:"—",    desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:85, name:"Ataque Especial ↑",  cost:"5 PE", desc:"Gaste 5 PE para receber +20 no ataque ou dano."},
    {nex:90, name:"Poder de Combatente",cost:"—",    desc:"Escolha um poder de combatente da lista."},
    {nex:95, name:"Aumento de Atributo",cost:"—",    desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:99, name:"Habilidade de Trilha",cost:"—",  desc:"Receba o 4° e último poder da sua trilha de Combatente.", isTrilhaMark:true},
  ],
  especialista:[
    {nex:5,  name:"Eclético",           cost:"2 PE",  desc:"Gaste 2 PE para receber os benefícios de ser treinado em qualquer perícia usada."},
    {nex:5,  name:"Perito (1d6)",       cost:"2 PE",  desc:"Escolha duas perícias treinadas. Gaste 2 PE para somar +1d6 no resultado do teste."},
    {nex:10, name:"Habilidade de Trilha",cost:"—",   desc:"Escolha uma trilha de Especialista e receba seu 1° poder.", isTrilhaMark:true},
    {nex:15, name:"Poder de Especialista",cost:"—",  desc:"Escolha um poder de especialista da lista."},
    {nex:20, name:"Aumento de Atributo",cost:"—",    desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:25, name:"Perito (1d8)",       cost:"3 PE",  desc:"Gaste 3 PE para somar +1d8 no resultado do teste."},
    {nex:30, name:"Poder de Especialista",cost:"—",  desc:"Escolha um poder de especialista da lista."},
    {nex:35, name:"Grau de Treinamento",cost:"—",    desc:"Escolha (5+INT) perícias treinadas; grau de treinamento aumenta em um."},
    {nex:40, name:"Engenhosidade",      cost:"+2 PE", desc:"Ao usar Eclético, gaste +2 PE adicionais para receber os benefícios de veterano na perícia."},
    {nex:40, name:"Habilidade de Trilha",cost:"—",  desc:"Receba o 2° poder da sua trilha de Especialista.", isTrilhaMark:true},
    {nex:45, name:"Poder de Especialista",cost:"—",  desc:"Escolha um poder de especialista da lista."},
    {nex:50, name:"Aumento de Atributo",cost:"—",    desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:50, name:"Versatilidade",      cost:"—",    desc:"Escolha um poder de especialista ou o 1° poder de uma trilha que não a sua."},
    {nex:55, name:"Perito (1d10)",      cost:"4 PE",  desc:"Gaste 4 PE para somar +1d10 no resultado do teste."},
    {nex:60, name:"Poder de Especialista",cost:"—",  desc:"Escolha um poder de especialista da lista."},
    {nex:65, name:"Habilidade de Trilha",cost:"—",  desc:"Receba o 3° poder da sua trilha de Especialista.", isTrilhaMark:true},
    {nex:70, name:"Grau de Treinamento",cost:"—",    desc:"Escolha (5+INT) perícias treinadas; grau de treinamento aumenta em um."},
    {nex:75, name:"Poder de Especialista",cost:"—",  desc:"Escolha um poder de especialista da lista."},
    {nex:75, name:"Engenhosidade Avançada",cost:"+4 PE",desc:"Ao usar Eclético, gaste +4 PE adicionais para receber benefícios de expert na perícia."},
    {nex:80, name:"Aumento de Atributo",cost:"—",    desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:85, name:"Perito (1d12)",      cost:"5 PE",  desc:"Gaste 5 PE para somar +1d12 no resultado do teste."},
    {nex:90, name:"Poder de Especialista",cost:"—",  desc:"Escolha um poder de especialista da lista."},
    {nex:95, name:"Aumento de Atributo",cost:"—",    desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:99, name:"Habilidade de Trilha",cost:"—",  desc:"Receba o 4° e último poder da sua trilha de Especialista.", isTrilhaMark:true},
  ],
  ocultista:[
    {nex:5,  name:"Escolhido pelo Outro Lado",cost:"—", desc:"Lança rituais de 1° círculo. Começa com 3 rituais de 1° círculo."},
    {nex:10, name:"Habilidade de Trilha",     cost:"—", desc:"Escolha uma trilha de Ocultista e receba seu 1° poder.", isTrilhaMark:true},
    {nex:15, name:"Poder de Ocultista",       cost:"—", desc:"Escolha um poder de ocultista da lista."},
    {nex:20, name:"Aumento de Atributo",      cost:"—", desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:25, name:"Rituais de 2° Círculo",    cost:"—", desc:"Você agora pode lançar rituais de 2° círculo."},
    {nex:30, name:"Poder de Ocultista",       cost:"—", desc:"Escolha um poder de ocultista da lista."},
    {nex:35, name:"Grau de Treinamento",      cost:"—", desc:"Escolha (5+INT) perícias treinadas; grau de treinamento aumenta em um."},
    {nex:40, name:"Habilidade de Trilha",     cost:"—", desc:"Receba o 2° poder da sua trilha de Ocultista.", isTrilhaMark:true},
    {nex:45, name:"Poder de Ocultista",       cost:"—", desc:"Escolha um poder de ocultista da lista."},
    {nex:50, name:"Aumento de Atributo",      cost:"—", desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:50, name:"Versatilidade",            cost:"—", desc:"Escolha um poder de ocultista ou o 1° poder de uma trilha que não a sua."},
    {nex:55, name:"Rituais de 3° Círculo",    cost:"—", desc:"Você agora pode lançar rituais de 3° círculo."},
    {nex:60, name:"Poder de Ocultista",       cost:"—", desc:"Escolha um poder de ocultista da lista."},
    {nex:65, name:"Habilidade de Trilha",     cost:"—", desc:"Receba o 3° poder da sua trilha de Ocultista.", isTrilhaMark:true},
    {nex:70, name:"Grau de Treinamento",      cost:"—", desc:"Escolha (5+INT) perícias treinadas; grau de treinamento aumenta em um."},
    {nex:75, name:"Poder de Ocultista",       cost:"—", desc:"Escolha um poder de ocultista da lista."},
    {nex:80, name:"Aumento de Atributo",      cost:"—", desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:85, name:"Rituais de 4° Círculo",    cost:"—", desc:"Você agora pode lançar rituais de 4° círculo."},
    {nex:90, name:"Poder de Ocultista",       cost:"—", desc:"Escolha um poder de ocultista da lista."},
    {nex:95, name:"Aumento de Atributo",      cost:"—", desc:"Aumente um atributo em +1 (máximo 5)."},
    {nex:99, name:"Habilidade de Trilha",     cost:"—", desc:"Receba o 4° e último poder da sua trilha de Ocultista.", isTrilhaMark:true},
  ],
};

/*
 * ── Patentes (tabela oficial, spec 0006) ──
 * Patente é concedida por Pontos de Prestígio (PP), não por NEX. Limite de
 * itens por categoria [Cat. 0, I, II, III, IV] (null = ilimitado) e limite
 * de crédito correspondente.
 */
export const PATENTES = [
  { nome: "Recruta",              prestigioMin: 0,   limiteItens: [null, 2, 0, 0, 0], limiteCredito: "Baixo" },
  { nome: "Operador",             prestigioMin: 20,  limiteItens: [null, 3, 1, 0, 0], limiteCredito: "Médio" },
  { nome: "Agente especial",      prestigioMin: 50,  limiteItens: [null, 3, 2, 1, 0], limiteCredito: "Médio" },
  { nome: "Oficial de operações", prestigioMin: 100, limiteItens: [null, 3, 3, 2, 1], limiteCredito: "Alto" },
  { nome: "Agente de elite",      prestigioMin: 200, limiteItens: [null, 3, 3, 3, 2], limiteCredito: "Ilimitado" },
];

export function patenteForPrestigio(pp) {
  const v = Number(pp) || 0;
  return [...PATENTES].reverse().find((p) => v >= p.prestigioMin) || PATENTES[0];
}

/* Capacidade de carga (em espaços) — baseada em Força. Mesma ressalva acima. */
export function cargaMaxima(attrs) {
  return 5 + (attrs?.FOR || 0) * 5;
}

/* Format a roll for the campaign feed / onRoll bridge (matches App handleRoll). */
export function rollPayload(label, res, charName, elemento) {
  return {
    attr: label,
    name: label,
    expr: res.expr || label,
    rolls: res.rolls,
    result: res.result,
    dice: res.dice || "D20",
    crit: !!res.crit,
    worst: !!res.worst,
    kind: res.kind || null,          // 'attack' | null
    dano: res.dano ?? null,          // total do dano (ataques)
    danoRolls: res.danoRolls ?? null,
    rollType: res.rollType || null,  // 'attribute'|'skill'|'attack'|'custom'
    elemento: elemento || null,      // elemento do personagem que rolou
    charName,
  };
}
