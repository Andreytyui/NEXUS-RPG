// Vercel serverless function — proxy seguro para Groq
// A chave GROQ_KEY fica apenas no servidor. Exige usuário Firebase autenticado e aplica
// rate limit por uid (spec 0004 AC-6) — antes era um proxy aberto na internet.

const { cors, verifyFirebaseIdToken } = require("./_lib");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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

  const key = process.env.GROQ_KEY;
  if (!key) return res.status(500).json({ error: "GROQ_KEY não configurada no servidor." });

  const idToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const auth = await verifyFirebaseIdToken(idToken);
  if (auth.error) return res.status(401).json({ error: auth.error });
  if (rateLimited(auth.uid)) return res.status(429).json({ error: "Muitas requisições — aguarde um minuto." });

  const { messages, model = "llama-3.3-70b-versatile", temperature = 0.85, max_tokens = 1024 } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Campo 'messages' obrigatório." });
  }

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({ error: err?.error?.message || "Erro na API de IA." });
    }

    const data = await upstream.json();
    const reply = data.choices?.[0]?.message?.content || "Sem resposta.";
    return res.status(200).json({ reply });
  } catch (e) {
    console.error("[api/ai] erro:", e.message);
    return res.status(500).json({ error: "Falha ao chamar a IA." });
  }
}
