---
name: STATE
description: Memória de trabalho volátil — onde paramos, próximo passo, bloqueios.
alwaysApply: true
---

# STATE — Memória viva do projeto

> Memória de trabalho **entre sessões** (humanos e agentes). É **volátil**: atualizada o tempo
> todo. Diferente do **ADR** (decisão durável e imutável). Decisão estrutural → ADR; estado do
> trabalho → aqui. Atualize ao **pausar/encerrar**; leia ao **retomar**. Use a skill `/handoff`.

**Última atualização:** 2026-07-02 por Claude (F1 — 0003-conformidade-licenca-op)

## Em andamento / próximo passo
- **Missão SaaS — plano F1→F7 (aprovado 2026-07-02):** F1 (licença, spec 0003) e F2 (segurança/pagamentos, spec 0004) implementadas
- **PENDENTE DE DEPLOY MANUAL (F2 só vale em produção após isso):** `firebase deploy --only firestore:rules` + deploy Vercel; env vars na Vercel: `FIREBASE_WEB_API_KEY` (obrigatória p/ /api/ai) e `MERCADOPAGO_WEBHOOK_SECRET` (recomendada)
- **F3 (observabilidade) concluída 2026-07-03:** 24 catches silenciosos de App.jsx agora logam com contexto (rastro em `specs/quick/001-observabilidade-catches/`)
- **F4 (fases do personagem, spec 0005) concluída 2026-07-03:** `form.phases[]`/`activePhaseId` (aditivo, fase "Normal" = avatar), galeria/CRUD no modal do retrato, upload+IA aplicam na fase ativa, `getActiveAvatar()` (novo `src/domain/character.js`, 5 testes) em todos os pontos de render (ficha, DossierCard, MestrePanel, SharedSheets, SheetList, cards). Gate: 5 suítes/11 testes + build verdes
- **Próximo passo:** F5 — rules.js fiel ao livro oficial (testes ≥80% ANTES, depois corrigir PV/PE por nível, peTurno, DT rituais, unlock de elemento NEX 15 vs 50, com migração dos máximos) — abrir spec 0006
- `0002-split-app-jsx` parcialmente entregue (hooks useAuth/useCharacter/useCampaign criados, usados pelo App root e testados); Task 4 (App.jsx enxuto) continua na F7 da missão

## Decisões recentes
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
- [ ] Deploy F2: `firebase deploy --only firestore:rules` + Vercel + env vars (`FIREBASE_WEB_API_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`)
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
