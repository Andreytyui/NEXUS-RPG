---
name: STATE
description: Memória de trabalho volátil — onde paramos, próximo passo, bloqueios.
alwaysApply: true
---

# STATE — Memória viva do projeto

> Memória de trabalho **entre sessões** (humanos e agentes). É **volátil**: atualizada o tempo
> todo. Diferente do **ADR** (decisão durável e imutável). Decisão estrutural → ADR; estado do
> trabalho → aqui. Atualize ao **pausar/encerrar**; leia ao **retomar**. Use a skill `/handoff`.

**Última atualização:** 2026-07-09 por Claude (0017 Onda 1 completa — DEPLOYADO)

> **2026-07-09: DEPLOY 0017** — commit `f90a316` em `origin/main` (github.com/Andreytyui/NEXUS-RPG,
> 28 arquivos) + `firebase deploy --only firestore:rules,hosting` no projeto `nexus-rpg-app`
> (nexus-rpg-app.web.app / playnexusrpg.com). Regras já estavam up-to-date no servidor ("skipping
> upload" — o todo de deploy das rules 0013 estava obsoleto, já estavam no ar); rules recompiladas
> e re-lançadas OK; 30 arquivos de hosting no ar (inclui `public/assets/higgsfield/`). Build via
> predeploy exit 0. Toda a Onda 1 do 0017 está em produção.

> **2026-07-08: SPEC 0017 (redesign animado gótico-arcano) — spec escrita + Onda 2 (ativos) FEITA;
> Onda 1 (CSS) parcial e integração PENDENTES (bloqueio: Node quebrado).**
> `specs/0017-redesign-animado/` (product+spec+design+tasks). Reconciliado com a realidade: o brief
> assumia Vite/Framer/"bug do roxo" — nada procede (theming reativo por sistema JÁ existe; App.jsx já
> tem 16 keyframes). Decisões com Andre: **CSS puro sem deps novas**, **Higgsfield gated**, **Tormenta
> segue verde**, **OP card mantém roxo arcano** (novo campo `cardAccent` no registry). Q1 resolvida.
> **Onda 1 (CSS) — tasks 1 e 3 escritas mas NÃO verificadas:** `src/themes/motion.js` (+test),
> `getCardAccent`/`cardAccent` em `themes/index.js`, `SYSTEMS` em App.jsx deriva accent via overlay
> `getCardAccent` (+ `systems-accent` test). Tasks 2,4-8 (keyframes globais + telas) PENDENTES.
> **Onda 2 (Higgsfield) — COMPLETA (~55,6 créditos, 44,4 restantes):** `public/assets/higgsfield/`
> img/ (fog-embers, emblem-op/dnd/tormenta, logo-n — .webp c/ alfa), video/ (fog-loop, idle-op/dnd/
> tormenta, logo-n — .mp4+.webm 720p, kling3_0_turbo image-to-video dos emblemas), audio/
> (narracao-mestre.mp3, voz 'Vlad' seed_audio PT-BR). `manifest.json` tem os job IDs. GLB 3D do item 5
> virou vídeo giratório (GLB exigiria three.js). **Itens 11 (trilha) e 12 (SFX) IMPOSSÍVEIS neste
> conector** (generate_audio só faz fala). Item 8 (explainer 30s) adiado por orçamento.
> **Node RESTAURADO** (v24.18.0 via Chocolatey; `node.exe` de volta em `C:\Program Files\nodejs`, mas
> ainda não no PATH do sistema — reabrir terminal p/ `npm start` achar sozinho; nos comandos do agente
> uso PATH inline). **Onda 1 tasks 1 e 3 VERIFICADAS** (13 testes verdes) + **INTEGRAÇÃO FEITA e
> verificada:** `AmbientBackdrop` (vídeo fog + poster, reduced-motion) no login e na seleção;
> `useReducedMotion` hook; cards da seleção agora mostram o emblema `.webp` por sistema + **loop idle
> em vídeo no hover**; logo N animado (`NexusLogoAnimated`) no login; stagger na lista de features;
> bloco global de CSS de motion + `@media(prefers-reduced-motion)` no `<style>` de `G`. **Gates: build
> compila (exit 0) + 15 suítes/105 testes verdes.** Ativos em `public/assets/higgsfield/` (manifest.json).
> **Feito também:** shimmer no botão de login (`nx-shimmer`), progress dots do carrossel que preenchem
> no tempo (`nx-progress-dot`), e **crossfade entre seções** do app (`key={screen}` + `.fade` no wrapper
> de `renderScreen()` ~L11971). Logo N animada foi REVERTIDA (Andre não gostou; assets ficam no disco).
> Tilt 3D no card foi VETADO por Andre. **Onda 1 CSS COMPLETA:** pílula de nav deslizante FEITA
> (shared-layout no `Sidebar` — indicador único mede a posição do item ativo via refs/offsets e
> desliza com `transform`+`EASE_HOVER`/`DUR_ENTER`; primeiro consumidor real de `themes/motion.js`;
> reduced-motion coberto pelo `@media` global). **2026-07-09: fechadas as 2 lacunas visuais objetivas
> que ainda faltavam:** (AC-3) cards de sistema `available:false` agora usam **skeleton shimmer** (barras
> `.skeleton` no lugar de desc+tags; opacity 0.55→0.9) em vez de só dimmar; (AC-4) **selo PRO/Livre** novo
> no header do Dashboard — ouro com `nx-shimmer` quando `isSubscribed`, estático "Livre" senão (antes NÃO
> existia selo de assinatura nenhum). Gates: build exit 0 + 15 suítes/105 testes verdes.
> **2026-07-09: fechados também os 2 sub-itens do AC-2** — (1) inputs do login ganharam **underline
> dourado que "desenha"** no `:focus` (`.nx-field::after` com `scaleX(0)→1`; focus é essencial, sob
> reduced-motion só snapa); (2) **anel de runas NOVO** em volta do logo do login (`NexusSigilRing`:
> SVG que se desenha via `stroke-dashoffset`, depois respira em opacity + ticks giram devagar) —
> aplicado nos 2 logos (hero desktop 160 + card mobile 72); logo agora sem `animate`/float, a graça é
> o anel. **ATENÇÃO Andre:** o anel é elemento decorativo NOVO (o design assumiu que já existia um; não
> existia — o logo é um `.jpg`). Como você reverteu o logo-N animado antes, este anel é candidato a veto
> — veja renderizado e me diga. Gates: build exit 0 + 15 suítes/105 testes verdes. Onda 1 100% coberta.
> **Não integrado:** voz do Ajudante do Mestre
> (`audio/narracao-mestre.mp3`) — precisa de decisão de UX de onde plugar. Itens 8 (explainer) e 11/12
> (trilha/SFX — impossíveis neste conector) pendentes. Gates verdes: build exit 0. **Ver `specs/0017`.**

> **2026-07-05 (6): 0013 (biblioteca de assets) IMPLEMENTADA** — coleção do usuário
> `users/{uid}/assets/{assetId}` (`{type,name,tags[],folder,data,hash,w,h}`), reutilizável entre
> campanhas. Dock inferior 🎒 (AssetDock.jsx): abas por tipo (mapa/prop/montaria/personagem/
> anexo/nota), busca por nome + chips de tag (client-side via `filterAssets`/`assetTags`), grid de
> miniaturas draggable. "🎒 Salvar na biblioteca" no ctx menu de token/imagem (reduz a ~256px +
> `saveAsset`, respeita `ASSET_SOFT_CAP=300`). `placeAsset` cria elemento na camada certa
> (mapa/prop/montaria→image; personagem/anexo→token c/ imagem; nota→note) por clique/drop;
> em campanha copia a imagem via `saveImage(db,cid,null,data)` → **dedup por hash** `img_a_<hash16>`
> (reusa 0009; jogador lê da campanha, nunca de `users/`); modo pessoal grava direto no
> `imageStore`. Novos: `assets/assetLib.js` (puro + Firestore, 9 testes) + `AssetDock.jsx`.
> Gates: 13 suítes/92 testes + build verdes. **Rule NOVA (`users/{uid}/assets`) — precisa
> `firebase deploy --only firestore:rules` ANTES do app (manual do Andre).** Pendência: validação
> de mesa (checklist tasks.md 0013: salvar→dock · arrastar cria · mesmo asset 2×=1 img_a · jogador vê · busca/tag).
> **2026-07-05 (4): 0012 (fog avançada) IMPLEMENTADA** — formas círculo (arrasto centro→raio),
> polígono (clique-a-clique; fecha no 1º ponto/duplo-clique/Enter; Esc cancela) e traço livre
> (Douglas-Peucker ε=4px) em Cobrir/Cortar; poda por contenção no commit (substituiu Join/Trim
> — ratificado no plano: mask binária torna união no-op visual); sub-modo edição 🧽 (clique
> seleciona forma de fog, Delete/botão apaga); preview 👁 visão do jogador (asViewer, pixel-
> igual). Novos: fog.js (geometria pura, 11 testes) + FogLayer.jsx (mask memoizada extraída
> do index.jsx — decomposição transversal avançou). Gates: 12 suítes/83 testes + build verdes.
> **Sem mudança de rules/schema.** Pendência: validação de mesa (checklist tasks.md 0012).
> **2026-07-05 (5): DEPLOY** — commits `6456999` (F7 App.jsx) + `efd7e11` (Owlbear 0009-0012)
> em `origin/main` (github.com/Andreytyui/NEXUS-RPG); Firebase Hosting deployado
> (nexus-rpg-app.web.app / playnexusrpg.com). Rules v2 já estavam no ar desde a 0009. Próximo:
> fase 0013 (biblioteca de assets).

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
- [ ] Deploy 0013 (Firebase): `firebase deploy --only firestore:rules` (regra nova `users/{uid}/assets`) ANTES do app + hosting (manual do Andre)
