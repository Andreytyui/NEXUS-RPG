---
name: STATE
description: Memória de trabalho volátil — onde paramos, próximo passo, bloqueios.
alwaysApply: true
---

# STATE — Memória viva do projeto

> Memória de trabalho **entre sessões** (humanos e agentes). É **volátil**: atualizada o tempo
> todo. Diferente do **ADR** (decisão durável e imutável). Decisão estrutural → ADR; estado do
> trabalho → aqui. Atualize ao **pausar/encerrar**; leia ao **retomar**. Use a skill `/handoff`.

**Última atualização:** 2026-07-05 por Claude (0012 — fog avançada implementada)

> **2026-07-05 (4): 0012 (fog avançada) IMPLEMENTADA** — formas círculo (arrasto centro→raio),
> polígono (clique-a-clique; fecha no 1º ponto/duplo-clique/Enter; Esc cancela) e traço livre
> (Douglas-Peucker ε=4px) em Cobrir/Cortar; poda por contenção no commit (substituiu Join/Trim
> — ratificado no plano: mask binária torna união no-op visual); sub-modo edição 🧽 (clique
> seleciona forma de fog, Delete/botão apaga); preview 👁 visão do jogador (asViewer, pixel-
> igual). Novos: fog.js (geometria pura, 11 testes) + FogLayer.jsx (mask memoizada extraída
> do index.jsx — decomposição transversal avançou). Gates: 12 suítes/83 testes + build verdes.
> **Sem mudança de rules/schema.** Pendência: validação de mesa (checklist tasks.md 0012).

> **2026-07-05 (3): 0011 (camadas Owlbear + anexos) IMPLEMENTADA** — auto-grudar (anexo→
> personagem, personagem→montaria) por drop; mover pai arrasta a subárvore; apagar pai
> DESANEXA filhos (reducer); duplicar leva a subárvore com vínculos remapeados; z-order
> (frente/trás por camada); ctx menu ampliado (desanexar, z-order, substituir imagem AC-7).
> Novo módulo puro attach.js (findAttachTarget/subtreeIds/wouldCycle/dupSubtree) + teste.
> Guard de ciclo e hidden/camada-invisível cobertos. Gates: 11 suítes/72 testes + build
> verdes. **Sem mudança de rules.** Task 4 (extrair LayersPanel.jsx) ADIADA — decomposição é
> meta transversal, não AC; comportamento entregue completo. **Pendência:** validação de mesa.

> **2026-07-05 (2): 0010 (interação do jogador) IMPLEMENTADA** — jogador com ferramentas
> Selecionar/Régua/Apontar, move o PRÓPRIO token (throttle 300ms + final, gated por
> `canMove` no cliente e rules v2 no servidor), ping por duplo-clique, apontador e régua
> compartilhados (canal `live_{uid}`, throttle 250ms, staleness 6s), Sync View (mestre 📡 →
> jogador segue até pan manual), "Atribuir a…" no ctx menu do token, ciclo de permissão por
> camada no painel (🚷/👤/👥). Novos: permissions.js, sync/live.js, PingsOverlay.jsx (+2
> suítes de teste; bug real de throttle pego pelo teste). Gates: 10 suítes/63 testes + build
> verdes. **Sem mudança de rules** (0009 já cobria). **Pendência:** validação de mesa com 2
> navegadores (checklist na Task 5 do tasks.md da 0010) + deploy do hosting.

> **2026-07-05: PLANO MESTRE OWLBEAR aprovado (specs 0009–0016)** — paridade com Owlbear Rodeo
> no editor de mapas; plano em `~/.claude/plans/o-owlbear-foi-analisado-keen-steele.md`.
> **0009 (fundação de dados v2, ARQUITETURAL) IMPLEMENTADA + rules DEPLOYADAS:** ADR 0006
> aceito; elementos em docs próprios (`map/{sceneId}/elements/*`), multi-cena com ponteiro
> `map/state`, 7 camadas Owlbear, fog por shapes (SVG mask), grid objeto, migração lazy
> idempotente (Firestore, pelo mestre ao abrir) + fase 3 do migrateScene (localStorage).
> Novos módulos: schema.js, migrations.js, grid.js, sync/campaignSync2.js, sync/elementDiff.js;
> campaignSync.js v1 REMOVIDO. Gates: 8 suítes/49 testes + build verdes.
> **Pendência 0009:** validação manual das rules (AC-5, checklist no tasks.md da 0009) e da
> mesa com 2 navegadores (AC-1/3/6); deploy do app (hosting) após validação.
> **Próximas fases:** 0010 (interação do jogador) e 0011 (camadas/anexos) — podem rodar em
> paralelo, ambas só dependem da 0009.

> **0008 (editor Owlbear fase 1) implementada 2026-07-04:** ferramenta de desenho
> (livre/linha/retângulo/círculo, cor+espessura, preview), tokens com imagem (`img_tok_*`),
> tamanhos P/M/G/E, condições por emoji (ctx menu), névoa por retângulo de arrasto, atalhos
> V/T/D/F/R/N/M/G. Gate: 7 suítes/41 testes + build verdes. Fase 2 (backlog): ping, barra de
> HP, fog poligonal, resize/rotate de desenhos, biblioteca de assets.
> Domínio próprio no ar: playnexusrpg.com (Firebase) + api.playnexusrpg.com (Vercel), Cloudflare DNS.
> **2026-07-04 (2):** rules do mapa endurecidas e DEPLOYADAS — escrita só do mestre (ADR 0005 §4
> fechado). Trilhas de Especialista (Infiltrador/Técnico) **BLOQUEADAS**: textos oficiais dos
> poderes 40/65/99% não verificáveis via web com confiança — parafrasear do livro físico (Andre).
> **2026-07-04 (3): F7 CONCLUÍDA** — spec 0002 fechada: footer extraído p/ `AppFooter` (módulo),
> função `App()` = 385 linhas (AC-4 verde via comando da spec). Gates: build + 7 suítes/41 testes
> verdes. AC-5 (regressão zero) aguarda teste manual no browser (login → ficha → campanha).
> **Bug em produção descoberto 2026-07-04:** login Google falha em playnexusrpg.com —
> domínio não está em Authorized domains do Firebase Auth (Console → Authentication →
> Settings → Authorized domains → adicionar `playnexusrpg.com`). Manual do Andre.

## Em andamento / próximo passo
- **Missão SaaS — plano F1→F7 (aprovado 2026-07-02):** F1–F6 implementadas
- **F6 (mesa tática multiplayer, spec 0007 + ADR 0005) implementada 2026-07-04:** MapEditor é o
  mapa oficial da campanha (mestre edita → `campaigns/{id}/map/scene` + `map/img_*`; jogador vê
  ao vivo read-only com fog opaca); tile-based REMOVIDO do CampaignMapTab (−16,8KB). Gate:
  7 suítes/41 testes + build verdes. **Pendências:** (1) validação manual na mesa com 2
  navegadores (mestre+jogador) — registrar aqui; (2) Andre ratificar ADR 0005
- **Tipografia OP (AC-6 da 0007, pedido do Andre 2026-07-04):** `--font-body` IM Fell English→Inter,
  `--font-data` Share Tech Mono→IBM Plex Mono; nome do personagem (Cinzel Decorative) e títulos
  (Cinzel) intocados
- **AINDA PENDENTE (Vercel, manual do Andre):** env vars `FIREBASE_WEB_API_KEY` (obrigatória —
  sem ela `/api/ai` falha fechado) e `MERCADOPAGO_WEBHOOK_SECRET` (recomendada)
- **Próximo passo:** validações manuais do Andre — (1) mesa com 2 navegadores, (2) fluxos pós-F7
  no browser (AC-5 da 0002), (3) domínio `playnexusrpg.com` nos Authorized domains do Firebase
  Auth, (4) env vars Vercel; backlog: trilhas de Especialista faltantes
- `0002-split-app-jsx` **CONCLUÍDA 2026-07-04** (F7): hooks useAuth/useCharacter/useCampaign +
  App() enxuto (385 linhas, AC-4); AC-5 pendente de teste manual no browser

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
- [x] Task 4: refatorar App.jsx para < 400 linhas — feito 2026-07-04 (App() = 385 linhas)
- [x] Task 5: rodar testes — 7 suítes/41 testes verdes, cobertura em `coverage/` (2026-07-04)
- [ ] Adicionar `playnexusrpg.com` aos Authorized domains (Firebase Console → Authentication → Settings) — login Google quebrado em produção até lá (manual)
- [x] Spec `0002-split-app-jsx` — todos os artefatos criados
- [x] Configurar GitHub Actions (ci.yml — build + testes + cobertura)
- [x] Secrets do Firebase configurados no GitHub
- [ ] Adicionar testes para `rules.js` (cálculos OP) — pós-split
