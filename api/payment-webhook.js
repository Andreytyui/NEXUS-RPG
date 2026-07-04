// Vercel serverless function — webhook de pagamento (Mercado Pago)
// NUNCA confia no payload: busca o pagamento na API do MP e só ativa se status === "approved"
// (spec 0004 AC-5). Payloads de outra origem (ex.: Catarse) não ativam nada — são logados
// para ativação manual, pois não há como verificar a autenticidade deles.
//
// Env vars:
//   MERCADOPAGO_ACCESS_TOKEN   — obrigatória para ativação automática
//   MERCADOPAGO_WEBHOOK_SECRET — recomendada; valida o header x-signature (HMAC-SHA256)
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

const crypto = require("crypto");

const FIREBASE_CONFIGURED =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

async function makeServiceAccountJwt(clientEmail, privateKeyPem) {
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

// Adiciona systemId ao array subscribedSystems do usuário (idempotente)
async function activateSystemPlan(uid, systemId, accessToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

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

// Valida o header x-signature do Mercado Pago (formato "ts=...,v1=...").
function verifySignature(req, dataId) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[webhook] MERCADOPAGO_WEBHOOK_SECRET ausente — assinatura não validada (a verificação na API do MP segue obrigatória)");
    return true;
  }
  try {
    const map = Object.fromEntries(
      String(req.headers["x-signature"] || "").split(",").map(p => p.trim().split("="))
    );
    if (!map.ts || !map.v1) return false;
    const manifest = `id:${String(dataId).toLowerCase()};request-id:${req.headers["x-request-id"] || ""};ts:${map.ts};`;
    const hmac = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(map.v1));
  } catch (e) {
    console.error("[webhook] erro na validação de assinatura:", e.message);
    return false;
  }
}

async function fetchPayment(paymentId) {
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
  });
  if (!r.ok) throw new Error(`MP respondeu ${r.status} ao buscar pagamento ${paymentId}`);
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const body = req.body || {};
    const query = req.query || {};

    // Formato Mercado Pago: body {type:"payment", data:{id}} ou query ?topic=payment&id=
    const paymentId =
      body.data?.id ||
      query["data.id"] ||
      (query.topic === "payment" ? query.id : null);

    if (!paymentId) {
      // Payload de outra origem (Catarse etc.) — inverificável, NUNCA ativa automaticamente.
      const email = body.data?.subscription?.email || body.subscriber?.email || body.email || null;
      const reward = body.data?.subscription?.reward?.title || body.reward?.title || body.plan?.name || null;
      if (email || reward) {
        console.warn(`[webhook] payload não-MP (Catarse?) — ativação MANUAL necessária: email=${email} reward=${reward}`);
        return res.status(200).json({ ok: true, manual: true });
      }
      console.warn("[webhook] payload sem payment id — ignorando:", JSON.stringify(body).slice(0, 300));
      return res.status(200).json({ ok: true, skipped: true });
    }

    if (!verifySignature(req, paymentId)) {
      console.error("[webhook] assinatura inválida para payment", paymentId);
      return res.status(401).json({ ok: false, error: "assinatura inválida" });
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.warn(`[webhook] MERCADOPAGO_ACCESS_TOKEN ausente — verificar pagamento ${paymentId} manualmente`);
      return res.status(200).json({ ok: true, manual: true, paymentId });
    }

    // Fonte da verdade: a API do MP, nunca o payload recebido.
    const payment = await fetchPayment(paymentId);

    if (payment.status !== "approved") {
      console.log(`[webhook] pagamento ${paymentId} status=${payment.status} — nada a fazer`);
      return res.status(200).json({ ok: true, ignored: payment.status });
    }

    const uid = payment.external_reference || null;
    const systemId = payment.metadata?.system_id || "op";

    if (!uid) {
      console.error(`[webhook] pagamento ${paymentId} aprovado sem external_reference — ativar manualmente: payer=${payment.payer?.email}`);
      return res.status(200).json({ ok: false, error: "sem external_reference" });
    }

    if (!FIREBASE_CONFIGURED) {
      console.warn(`[webhook] Firebase não configurado. Ativar manualmente: uid=${uid} sistema=${systemId}`);
      return res.status(200).json({ ok: true, manual: true, uid, systemId });
    }

    const token = await getFirestoreToken();
    await activateSystemPlan(uid, systemId, token);
    console.log(`[webhook] Plano ${systemId} ativado para uid=${uid} (payment ${paymentId})`);
    return res.status(200).json({ ok: true, activated: true, uid, systemId });

  } catch (e) {
    console.error("[webhook] erro:", e.message);
    // 500 faz o Mercado Pago re-tentar (antes retornava 200 e o erro se perdia)
    return res.status(500).json({ ok: false, error: e.message });
  }
};
