// Vercel serverless function — webhook do Catarse
// Ativado quando alguém assina um plano do Nexus RPG no Catarse.
//
// Env vars necessárias:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

// Mapeamento: título do reward no Catarse → systemId no Nexus
const PLAN_MAP = {
  "Agente da Ordem":    "op",
  "Aventureiro de Arton": "tormenta",
  "Herói Lendário":    "dnd",
  // Adicione aliases se usar nomes diferentes no Catarse:
  "Ordem":             "op",
  "Tormenta":          "tormenta",
  "D&D":               "dnd",
};

const FIREBASE_CONFIGURED =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

async function makeServiceAccountJwt(clientEmail, privateKeyPem) {
  const crypto = require("crypto");
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail, sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore",
  })).toString("base64url");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  return `${header}.${payload}.${sign.sign(privateKeyPem, "base64url")}`;
}

async function getFirestoreToken() {
  const jwt = await makeServiceAccountJwt(
    process.env.FIREBASE_CLIENT_EMAIL,
    (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
  );
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await r.json();
  return access_token;
}

// Busca uid do Firebase pelo email do assinante
async function getUidByEmail(email, accessToken) {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/accounts:lookup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ email: [email] }),
    }
  );
  const data = await r.json();
  return data.users?.[0]?.localId || null;
}

// Adiciona systemId ao array subscribedSystems do usuário
async function activateSystemPlan(uid, systemId, accessToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

  // Lê o doc atual para pegar o array existente
  const getRes = await fetch(docUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const current = await getRes.json();
  const existing = current.fields?.subscribedSystems?.arrayValue?.values?.map(v => v.stringValue) || [];

  if (existing.includes(systemId)) return; // já ativo

  const updated = [...existing, systemId];
  await fetch(`${docUrl}?updateMask.fieldPaths=subscribedSystems`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      fields: {
        subscribedSystems: {
          arrayValue: { values: updated.map(s => ({ stringValue: s })) }
        }
      }
    }),
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const body = req.body || {};
    console.log("[webhook] payload:", JSON.stringify(body).slice(0, 500));

    // Catarse envia diferentes formatos — tentamos extrair email e reward
    const email =
      body.data?.subscription?.email ||
      body.subscriber?.email ||
      body.email ||
      null;

    const rewardTitle =
      body.data?.subscription?.reward?.title ||
      body.reward?.title ||
      body.plan?.name ||
      null;

    // Também aceita o ?ref=uid que passamos na URL do Catarse
    const refUid = req.query?.ref || body.ref || null;

    if (!email && !refUid) {
      console.warn("[webhook] sem email nem ref uid — ignorando");
      return res.status(200).json({ ok: true, skipped: true });
    }

    const systemId = rewardTitle ? PLAN_MAP[rewardTitle] : null;
    if (!systemId) {
      console.warn("[webhook] reward não mapeado:", rewardTitle);
      return res.status(200).json({ ok: true, skipped: true, rewardTitle });
    }

    if (!FIREBASE_CONFIGURED) {
      console.warn(`[webhook] Firebase não configurado. Ativar manualmente: email=${email} uid=${refUid} sistema=${systemId}`);
      return res.status(200).json({ ok: true, manual: true, email, systemId });
    }

    const token = await getFirestoreToken();

    // Resolve uid: usa refUid direto (mais confiável) ou busca por email
    let uid = refUid;
    if (!uid && email) {
      uid = await getUidByEmail(email, token);
    }

    if (!uid) {
      console.warn(`[webhook] usuário não encontrado: email=${email}`);
      return res.status(200).json({ ok: false, error: "usuário não encontrado" });
    }

    await activateSystemPlan(uid, systemId, token);
    console.log(`[webhook] Plano ${systemId} ativado para uid=${uid}`);
    return res.status(200).json({ ok: true, activated: true, uid, systemId });

  } catch (e) {
    console.error("[webhook] erro:", e.message);
    return res.status(200).json({ ok: false, error: e.message });
  }
};
