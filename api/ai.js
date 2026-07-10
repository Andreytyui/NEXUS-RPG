// Vercel serverless function — proxy seguro de IA com fallback multi-provider (spec 0018)
// Cascata: Groq (primário) → NVIDIA-Mistral (fallback de disponibilidade). As chaves ficam
// só no servidor. Exige usuário Firebase autenticado e aplica rate limit por uid (spec 0004 AC-6).

const { cors, verifyFirebaseIdToken } = require("./_lib");
const { PROVIDER_CHAIN, shouldFallback, buildRequestBody } = require("../src/server/aiFallback");

// Rate limit simples por instância (zera a cada cold start — barra abuso casual; para
// garantia forte seria preciso um store externo, fora do escopo da spec 0004).
const RATE_LIMIT = 20;         // requisições
const RATE_WINDOW_MS = 60000;  // por minuto
const hits = new Map();
function rateLimited(uid) {
  const now = Date.now();
  const recent = (hits.get(uid) || []).filter(t => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(uid, recent);
  return recent.length > RATE_LIMIT;
}

module.exports = async function handler(req, res) {
  cors(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.GROQ_KEY) return res.status(500).json({ error: "GROQ_KEY não configurada no servidor." });

  const idToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const auth = await verifyFirebaseIdToken(idToken);
  if (auth.error) return res.status(401).json({ error: auth.error });
  if (rateLimited(auth.uid)) return res.status(429).json({ error: "Muitas requisições — aguarde um minuto." });

  const { messages, temperature = 0.85, max_tokens = 1024 } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Campo 'messages' obrigatório." });
  }

  // Cascata (spec 0018): tenta cada elo em ordem; falha de disponibilidade (429/5xx/timeout)
  // passa para o próximo, falha de requisição (4xx≠429) retorna direto (repetiria em todo elo).
  let attempted = 0;
  let lastAttempt = { status: 500, message: "Falha ao chamar a IA." };

  for (const provider of PROVIDER_CHAIN) {
    const key = process.env[provider.keyEnv];
    if (!key) {
      console.warn(`[api/ai] ${provider.id}: ${provider.keyEnv} não configurada — pulando elo.`);
      continue;
    }
    attempted++;

    try {
      const upstream = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(buildRequestBody(provider, { messages, temperature, max_tokens })),
        signal: AbortSignal.timeout(provider.timeoutMs),
      });

      if (!upstream.ok) {
        const err = await upstream.json().catch(() => ({}));
        const message = err?.error?.message || `Erro na API de IA (${provider.id}).`;
        lastAttempt = { status: upstream.status, message };

        if (shouldFallback(upstream.status)) {
          console.warn(`[api/ai] ${provider.id} falhou (${upstream.status}) — tentando próximo elo.`);
          continue;
        }
        // 4xx ≠ 429: falha de requisição, não cascateia (repetiria em todo elo).
        return res.status(upstream.status).json({ error: message });
      }

      const data = await upstream.json();
      const reply = data.choices?.[0]?.message?.content || "Sem resposta.";
      return res.status(200).json({ reply, provider: provider.id });
    } catch (e) {
      console.warn(`[api/ai] ${provider.id} erro de rede/timeout: ${e.message} — tentando próximo elo.`);
      lastAttempt = { status: 500, message: "Falha ao chamar a IA." };
    }
  }

  if (attempted === 1) {
    // Só a Groq foi tentada (NVIDIA_API_KEY ausente) — repassa o erro exato dela, igual ao
    // comportamento do proxy antes desta feature (spec 0018 AC-5).
    return res.status(lastAttempt.status).json({ error: lastAttempt.message });
  }

  // 2+ elos tentados e todos falharam por disponibilidade (spec 0018 AC-4).
  console.error("[api/ai] todos os elos da cascata falharam. Último:", lastAttempt);
  return res.status(503).json({ error: "O Ajudante do Mestre está temporariamente indisponível. Tente novamente em instantes." });
}
