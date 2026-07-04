// Helpers compartilhados das serverless functions (prefixo "_" = não vira endpoint na Vercel).

const DEFAULT_ORIGINS = [
  "https://nexus-rpg-app.web.app",
  "https://nexus-rpg-app.firebaseapp.com",
  "https://playnexusrpg.com",
  "https://www.playnexusrpg.com",
  "http://localhost:3000",
];

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(s => s.trim()).filter(Boolean)
  .concat(DEFAULT_ORIGINS);

// CORS com allowlist — só reflete a origem se ela for conhecida (spec 0004 AC-6).
function cors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Verifica um Firebase ID token via Identity Toolkit (dispensa Admin SDK).
async function verifyFirebaseIdToken(idToken) {
  const key = process.env.FIREBASE_WEB_API_KEY;
  if (!key) return { error: "FIREBASE_WEB_API_KEY não configurada no servidor." };
  if (!idToken) return { error: "Token ausente." };
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!r.ok) return { error: "Token inválido." };
  const data = await r.json();
  const user = data.users && data.users[0];
  if (!user) return { error: "Token inválido." };
  return { uid: user.localId };
}

module.exports = { cors, verifyFirebaseIdToken };
