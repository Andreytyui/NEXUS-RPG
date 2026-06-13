// Vercel serverless function — proxy seguro para Groq
// A chave GROQ_KEY fica apenas no servidor, nunca exposta no bundle do frontend.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.GROQ_KEY;
  if (!key) return res.status(500).json({ error: "GROQ_KEY não configurada no servidor." });

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
