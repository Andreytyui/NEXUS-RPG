---
name: spec-0004-seguranca-pagamentos
description: Contrato da feature (critérios de aceite). Base enquanto a feature está ativa.
alwaysApply: true
---

# Spec — Segurança do Firestore e do fluxo de pagamentos

> **Fonte da verdade.** Status: aprovado (Andre, 2026-07-03 — "ok" para F2 do plano da auditoria FASE 0)
> Motivação: auditoria FASE 0 (2026-07-02) — paywall burlável, webhook sem verificação,
> pagamento PIX nunca ativa plano (formato Catarse ≠ Mercado Pago), proxy de IA aberto,
> `publicSheets` graváveis por qualquer autenticado, subcoleção `map` sem regra (sync negado).

## Resumo
Fecha as brechas de segurança/monetização: campos de plano só graváveis pelo backend, fichas
públicas com dono, regra para a subcoleção `map`, webhook que confirma o pagamento na API do
Mercado Pago antes de ativar, e proxy de IA autenticado — tudo retrocompatível.

## Critérios de aceite

### AC-1: Cliente não consegue se dar plano
- **Dado** um usuário autenticado
- **Quando** tenta gravar `plan` (≠ criação com "free") ou `subscribedSystems` em `users/{uid}` pelo SDK client
- **Então** o Firestore nega (`PERMISSION_DENIED`); demais campos (email, musicLinks…) continuam graváveis;
  cadastro (create com `plan:"free"`) e login continuam funcionando.

### AC-2: Login não reseta plano (bug ativo hoje)
- **Dado** um usuário com plano pago em `users/{uid}.plan`
- **Quando** ele loga novamente (`fsEnsureUserDoc` em `useAuth.js`)
- **Então** o doc NÃO é sobrescrito com `plan:"free"` — o hook só cria o doc quando não existe
  (e atualiza apenas `email` se mudou); erro logado com contexto (sem catch silencioso).

### AC-3: Fichas públicas têm dono
- **Dado** `publicSheets/{charId}`
- **Quando** alguém cria → exige `ownerUid == auth.uid`; edita/apaga → só o dono
- **Então** docs legados sem `ownerUid` continuam editáveis (o primeiro editor autenticado os
  reivindica gravando seu `ownerUid` — retrocompat consciente); leitura pública inalterada;
  `pendingEdits`: criar continua público (by design), resolver (update/delete) só o dono da ficha.

### AC-4: Subcoleção de mapa passa a ter regra
- **Dado** `campaigns/{id}/map/{doc}`
- **Quando** um membro da campanha lê/escreve
- **Então** é permitido; não-membros são negados (hoje TODOS são negados — sync silenciosamente quebrado).

### AC-5: Webhook só ativa plano com pagamento confirmado
- **Dado** um POST em `/api/payment-webhook`
- **Quando** o payload chega (formato Mercado Pago: `data.id` / `?topic=payment&id=`)
- **Então** o handler **busca o pagamento na API do MP** e só ativa se `status === "approved"`,
  usando `external_reference` (uid) e `metadata.system_id`; o payload nunca é confiado;
  header `x-signature` validado por HMAC quando `MERCADOPAGO_WEBHOOK_SECRET` estiver configurada;
  ativação é idempotente (retries do MP não duplicam); erro real → HTTP 500 (MP re-tenta);
  payloads estilo Catarse **não ativam mais nada** — são logados para ativação manual.

### AC-6: Proxy de IA exige usuário autenticado
- **Dado** `/api/ai`
- **Quando** chega requisição sem `Authorization: Bearer <Firebase ID token>` válido
- **Então** responde 401; com token válido responde normalmente; rate limit por uid
  (20 req/min por instância) responde 429; CORS restrito à allowlist de origens
  (`ALLOWED_ORIGINS`, default: domínios do app + localhost); cliente (`callGemini`) passa a
  enviar o ID token.

## Casos de borda e erros
- MP re-envia notificação (retry) → `activateSystemPlan` verifica se o sistema já está no array (idempotente).
- `MERCADOPAGO_WEBHOOK_SECRET` ausente → assinatura não é validada (log de aviso), mas a
  confirmação na API do MP continua obrigatória (propriedade de segurança principal).
- Token Firebase expirado no cliente → `getIdToken()` renova automaticamente antes do fetch.
- Ficha pública legada sem `ownerUid` → editável até ser reivindicada (documentado; alternativa de
  bloquear geral quebraria edição dos donos legítimos legados).
- Webhook sem `FIREBASE_*` configurado → loga instrução de ativação manual e responde 200 (comportamento atual).

## Fora de escopo
> Vinculante. Não implemente nada aqui.
- Restringir `allow read` amplo de `campaigns/{id}` (join por código depende de query por
  `inviteCode`; exige redesenho com coleção `invites/` — candidata à F6/B2). Risco documentado.
- Migrar plano para Custom Claims do Firebase Auth (melhoria futura; exigiria Admin SDK completo).
- UI de pagamento (PlansScreen segue com links Catarse + PIX existente).
- Deploy: `firebase deploy --only firestore:rules` e deploy Vercel são passos manuais do Andre.

## Matriz de decisão — escrita em `users/{uid}` (client SDK)

| Operação | Campos afetados                    | Resultado | AC |
|----------|------------------------------------|-----------|----|
| create   | `email`, `plan:"free"`             | permite   | AC-1 |
| create   | inclui `subscribedSystems`         | nega      | AC-1 |
| update   | `email` / `musicLinks` / outros    | permite   | AC-1 |
| update   | toca `plan` ou `subscribedSystems` | nega      | AC-1 |
| qualquer | uid ≠ auth.uid                     | nega      | AC-1 |

## Rastreabilidade
- Auditoria FASE 0 — achados críticos nº 2 e 3; `docs/product/conformidade-licenca-op.md` item 9 (LGPD).
- Env vars novas: `MERCADOPAGO_WEBHOOK_SECRET` (recomendada), `FIREBASE_WEB_API_KEY` (obrigatória p/ /api/ai), `ALLOWED_ORIGINS` (opcional) — documentadas em `.env.example`.
