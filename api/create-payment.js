// Vercel serverless function — cria cobrança PIX via Mercado Pago
// Requer env var: MERCADOPAGO_ACCESS_TOKEN

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "MERCADOPAGO_ACCESS_TOKEN não configurada." });
  }

  const { userId, userEmail, planName = "ordem" } = req.body || {};
  if (!userId || !userEmail) {
    return res.status(400).json({ error: "userId e userEmail são obrigatórios." });
  }

  // Preços por plano (em BRL)
  const PRICES = { ordem: 19.90 };
  const amount = PRICES[planName] || 19.90;

  const baseUrl = process.env.WEBHOOK_BASE_URL || `https://${process.env.VERCEL_URL}`;
  const notificationUrl = `${baseUrl}/api/payment-webhook`;

  try {
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": `nexus-${userId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `Plano Ordem — Nexus RPG`,
        payment_method_id: "pix",
        payer: { email: userEmail },
        // userId é salvo aqui para o webhook poder ativar o plano correto
        external_reference: userId,
        notification_url: notificationUrl,
        // Expira em 30 minutos
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    });

    if (!mpRes.ok) {
      const err = await mpRes.json().catch(() => ({}));
      console.error("[create-payment] MP erro:", err);
      return res.status(mpRes.status).json({ error: err.message || "Erro ao criar pagamento." });
    }

    const data = await mpRes.json();

    const qrCode = data.point_of_interaction?.transaction_data?.qr_code || null;
    const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64 || null;

    return res.status(200).json({
      paymentId: data.id,
      status: data.status,
      amount,
      pixCode: qrCode,
      qrCodeBase64,
    });
  } catch (e) {
    console.error("[create-payment] erro:", e.message);
    return res.status(500).json({ error: "Falha ao criar cobrança PIX." });
  }
}
