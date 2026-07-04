---
name: tasks-0004-seguranca-pagamentos
description: Decomposição e gates da feature. Puxe ao implementar.
alwaysApply: false
---

# Tasks — Segurança do Firestore e do fluxo de pagamentos

> Gate executável: `CI=false npm run build` + `npm test` (hooks) verdes. Regras e APIs exigem
> verificação manual pós-deploy (deploy é manual: `firebase deploy --only firestore:rules` + Vercel).

## Plano
| # | Task                                                                    | Cobre AC | Depende de | Gate                               | Status |
|---|-------------------------------------------------------------------------|----------|------------|------------------------------------|--------|
| 1 | `firestore.rules`: proteger `plan`/`subscribedSystems` em users         | AC-1     | —          | deploy manual + teste no console   | todo   |
| 2 | `useAuth.js`: `fsEnsureUserDoc` create-only (não clobber `plan`)        | AC-2     | —          | `npm test` (useAuth)               | todo   |
| 3 | `firestore.rules`: dono em `publicSheets` + `pendingEdits` `[P]`        | AC-3     | —          | deploy manual + fluxo /p/:id       | todo   |
| 4 | `firestore.rules`: regra p/ `campaigns/{id}/map/{doc}` `[P]`            | AC-4     | —          | deploy manual + mapa em campanha   | todo   |
| 5 | `api/payment-webhook.js`: reescrever (MP fetch+approved, HMAC, Catarse→manual) | AC-5 | —      | revisão + teste com MP sandbox     | todo   |
| 6 | `api/create-payment.js`: `metadata.system_id` + CORS allowlist `[P]`    | AC-5,6   | 7          | revisão                            | todo   |
| 7 | `api/_lib.js`: helper compartilhado (cors allowlist + verify ID token)  | AC-6     | —          | revisão                            | todo   |
| 8 | `api/ai.js`: exigir ID token + rate limit por uid + CORS `[P]`          | AC-6     | 7          | curl sem token → 401               | todo   |
| 9 | `App.jsx` `callGemini`: enviar `Authorization: Bearer <idToken>`        | AC-6     | 8          | build + Assistente do Mestre       | todo   |
| 10| `vercel.json`: remover CORS `*` estático das rotas /api                 | AC-6     | 7          | revisão                            | todo   |
| 11| `.env.example`: documentar novas env vars + STATE.md                    | AC-5,6   | 1–10       | revisão                            | todo   |

## Plano de teste
- Unidade: testes existentes de hooks continuam verdes (useAuth com novo fluxo create-only).
- Aceite manual pós-deploy: (AC-1) console do navegador tentar `updateDoc(users/self,{subscribedSystems:['op']})` → negado;
  (AC-3) editar ficha pública de outro usuário → negado; (AC-4) abrir mapa de campanha como membro → sem erro de permissão;
  (AC-5) pagamento PIX sandbox → plano ativa; POST forjado sem pagamento real → nada ativa;
  (AC-6) `curl -X POST /api/ai` sem token → 401.
- Regressão: cadastro novo, login existente, salvar ficha, salvar ficha pública própria, chat do Assistente.

## Divergências (SPEC_DEVIATION)
- [ ] (nenhuma)

## Checklist de Definition of Done
- [ ] Build + testes verdes
- [ ] Nenhum catch silencioso novo (novos handlers logam com contexto)
- [ ] Spec reflete o construído
- [ ] `docs/STATE.md` atualizado (inclui pendência: deploy manual das rules/APIs)
