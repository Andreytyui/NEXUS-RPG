---
name: STATE
description: Memória de trabalho volátil — onde paramos, próximo passo, bloqueios.
alwaysApply: true
---

# STATE — Memória viva do projeto

> Memória de trabalho **entre sessões** (humanos e agentes). É **volátil**: atualizada o tempo
> todo. Diferente do **ADR** (decisão durável e imutável). Decisão estrutural → ADR; estado do
> trabalho → aqui. Atualize ao **pausar/encerrar**; leia ao **retomar**. Use a skill `/handoff`.

**Última atualização:** 2026-07-03 por Claude (F5 — 0006-rules-fiel-ao-oficial)

## Em andamento / próximo passo
- **Missão SaaS — plano F1→F7 (aprovado 2026-07-02):** F1–F5 implementadas
- **Deploy 2026-07-03:** commit F1–F4 + F5 no GitHub (main); `firebase deploy` feito (firestore:rules + hosting) — **rules da F2 estão em produção**
- **AINDA PENDENTE (Vercel, manual do Andre):** env vars `FIREBASE_WEB_API_KEY` (obrigatória — sem ela `/api/ai` falha fechado) e `MERCADOPAGO_WEBHOOK_SECRET` (recomendada)
- **F5 (rules.js fiel ao oficial, spec 0006) concluída 2026-07-03:** ver decisões abaixo. Gate: 6 suítes/39 testes verdes, rules.js 100% linhas (≥80% exigido), build verde
- **Próximo passo:** F6 — MapEditor novo vira o mapa multiplayer oficial (Firestore sync em `campaigns/{id}/map`, aposentar o tile-based) — exigirá ADR e spec 0007
- `0002-split-app-jsx` parcialmente entregue (hooks useAuth/useCharacter/useCampaign criados, usados pelo App root e testados); Task 4 (App.jsx enxuto) continua na F7 da missão

## Decisões recentes
- 2026-07-03: F5 (spec 0006) — verificação contra o oficial REFUTOU a auditoria em PV/PE/peTurno (código já era fiel; **migração de máximos descartada**). Fixes reais: DT de rituais agora calculada (10 + NEX/5 + PRE + bônus; campo manual legado migra p/ bônus, idempotente), deslocamento oficial 9m/6q (era 6+AGI), NEX_LADDER com marcos oficiais (trilha 10/40/65/99, atributo 20/50/80/95, afinidade só no 50), PATENTES = tabela oficial de 5 por Pontos de Prestígio (`patenteForPrestigio`; `patenteForNex` removido)
- 2026-07-03: F2 implementada (spec 0004) — rules protegem `plan`/`subscribedSystems` (fecha paywall burlável), `publicSheets` com dono (legados reivindicáveis), regra p/ subcoleção `map` (destrava sync); webhook verifica pagamento na API do MP + HMAC opcional, Catarse vira ativação manual; `/api/ai` exige ID token + rate limit; CORS allowlist; fix: login não reseta mais `plan` (`useAuth`). Deploy manual pendente.
- 2026-07-02: Auditoria FASE 0 (frentes A–E) + plano F1→F7 aprovado. Críticos: violações da licença OP, paywall burlável (`users/{uid}` write), webhook sem assinatura/formato Catarse≠MP, dois sistemas de mapa (novo é localStorage-only, sem regra Firestore p/ `campaigns/{id}/map`)
- 2026-07-02: F1 implementada — selo + texto obrigatório (`src/components/LicencaOP.jsx`), rótulos "Conteúdo oficial" renomeados, avisos de IA (flag `form.avatarAI`), checklist em `docs/product/conformidade-licenca-op.md`
- 2026-07-02: Decisões de produto aprovadas: rules.js fiel ao livro oficial (F5, com migração de máximos); MapEditor novo vira o mapa multiplayer oficial e o tile-based será aposentado (F6, exigirá ADR); IA tratada como recurso gratuito até validação jurídica (licença proíbe IA em conteúdo comercial)
- 2026-06-24: Spec `0002-split-app-jsx` completa — product.md, design.md, domain.md, spec.md, tasks.md criados
- 2026-06-24: Chat UI redesenhado — bubbles mais claras, fonte 17px, input 42px, botão roxo
- 2026-06-24: Correção de join de campanha — multi-where Firestore → single-where + filtro client-side
- 2026-06-24: Regra Firestore adicionada — não-membros podem se adicionar via inviteCode
- 2026-06-23: CI/CD criado em `.github/workflows/ci.yml` — build + testes + cobertura como artefato
- 2026-06-22: Firebase como backend — [ADR-0002](architecture/adr/0002-firebase-backend.md)
- 2026-06-22: React CRA como bundler — [ADR-0003](architecture/adr/0003-react-cra.md)
- 2026-06-22: Inline styles como estratégia — [ADR-0004](architecture/adr/0004-inline-styles.md)

## Bloqueios
- Nenhum bloqueio ativo

## Ideias adiadas / backlog técnico
- Cobertura mínima (%) — definir após primeiros testes dos hooks
- Migração de CRA para Vite → após split de App.jsx
- TypeScript → quando base de testes estiver sólida

## Todos soltos
- [x] F1: conformidade da licença OP (spec 0003) — implementada 2026-07-02; validar com `/validar`
- [x] F2: segurança e pagamentos (spec 0004) — implementada 2026-07-03
- [x] Deploy F2 (Firebase): `firebase deploy --only firestore:rules` + hosting — feito 2026-07-03
- [ ] Deploy F2 (Vercel): env vars `FIREBASE_WEB_API_KEY` e `MERCADOPAGO_WEBHOOK_SECRET` no painel (manual)
- [ ] Trilhas de Especialista faltantes (Infiltrador, Técnico) + revisão paráfrase×cópia dos textos de poderes (fora de escopo da 0006)
- [ ] Pendência jurídica: IA × conteúdo comercial (ver `docs/product/conformidade-licenca-op.md`)
- [ ] Revisar `src/data/ordemParanormal/*.json` — paráfrase vs texto copiado do livro
- [x] Task 1: criar `src/hooks/useAuth.js`
- [x] Task 2: criar `src/hooks/useCharacter.js`
- [x] Task 3: criar `src/hooks/useCampaign.js`
- [ ] Task 4: refatorar App.jsx para < 400 linhas (→ F7 da missão)
- [ ] Task 5: rodar testes — 3 hooks com 1 teste verde cada
- [x] Spec `0002-split-app-jsx` — todos os artefatos criados
- [x] Configurar GitHub Actions (ci.yml — build + testes + cobertura)
- [x] Secrets do Firebase configurados no GitHub
- [ ] Adicionar testes para `rules.js` (cálculos OP) — pós-split
