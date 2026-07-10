/* ════════════════════════════════════════════════════════════════════════
 *  NEXUS RPG — CASCATA DE FALLBACK DE IA  (spec 0018 · AC-7)
 *  ------------------------------------------------------------------------
 *  Lógica pura de decisão do fallback multi-provider do proxy /api/ai.
 *  Zero I/O, zero fetch, zero acesso a process.env aqui dentro — env só é
 *  lida na orquestração (api/ai.js). CommonJS (não ESM) de propósito: este
 *  arquivo é `require()`ado diretamente por api/ai.js, que roda como Node
 *  puro na Vercel, sem passar por bundler/Babel.
 *
 *  Mora em src/server/ (não em api/) para ser descoberto pelo Jest do CRA,
 *  cujo `roots` está travado em `<rootDir>/src` (verificado em
 *  node_modules/react-scripts/scripts/utils/createJestConfig.js) — ver
 *  design.md da spec 0018, eixo "Arquitetura base".
 * ════════════════════════════════════════════════════════════════════════ */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Cascata de provedores, em ordem de tentativa. Cada elo é um value object
 * `{ id, url, keyEnv, model, extraParams, timeoutMs }` (ver domain.md).
 * `keyEnv` é o NOME da env var onde a chave mora — nunca a chave em si.
 */
const PROVIDER_CHAIN = [
  {
    id: "groq",
    url: GROQ_URL,
    keyEnv: "GROQ_KEY",
    model: "llama-3.3-70b-versatile",
    extraParams: {},
    timeoutMs: 4000,
  },
  {
    id: "nvidia-mistral",
    url: NVIDIA_URL,
    keyEnv: "NVIDIA_API_KEY",
    model: "mistralai/mistral-medium-3.5-128b",
    extraParams: { reasoning_effort: "low" },
    timeoutMs: 5000,
  },
];

/**
 * Falha de disponibilidade (429 rate-limit, ou 5xx) deve cascatear para o
 * próximo elo. Falha de requisição (4xx ≠ 429) não deve — repetiria em
 * todo elo, então falhar rápido é melhor (spec 0018 AC-3).
 * @param {number} status
 * @returns {boolean}
 */
function shouldFallback(status) {
  return status === 429 || status >= 500;
}

/**
 * Monta o corpo da requisição para um elo específico da cascata: params
 * base (comuns a todo provedor OpenAI-compatível) + extraParams do elo
 * (ex.: reasoning_effort só existe na NVIDIA — nunca vaza pra Groq).
 * @param {{model:string, extraParams:object}} provider
 * @param {{messages:Array, temperature?:number, max_tokens?:number}} opts
 * @returns {object}
 */
function buildRequestBody(provider, { messages, temperature = 0.85, max_tokens = 1024 }) {
  return {
    model: provider.model,
    messages,
    temperature,
    max_tokens,
    ...provider.extraParams,
  };
}

module.exports = { PROVIDER_CHAIN, shouldFallback, buildRequestBody };
