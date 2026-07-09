---
name: spec-redesign-animado
description: Contrato do redesign animado gótico-arcano (login/seleção/dashboard) — motion padronizado, accent por sistema unificado, prefers-reduced-motion. Onda 1 puro CSS; Onda 2 (Higgsfield) atrás de gate de orçamento.
alwaysApply: true
---

# Spec — Redesign animado (gótico-arcano)

> **Fonte da verdade.** Status: rascunho (aguardando aprovação do `design.md`).
> Tier: arquitetural (integração externa Higgsfield na Onda 2). Design: [`./design.md`].
> Deriva do brief "Redesign Animado da Nexus com Higgsfield" (2026-07-06), **reconciliado
> com o código real** (o brief assumia Vite/Framer/purple-bug; nada disso procede).

## Resumo

Elevar o acabamento visual das 3 telas de entrada (login, seleção de sistema, dashboard)
com um sistema de motion padronizado (easings/durações/stagger), unificar o accent por
sistema numa única fonte de verdade, e respeitar `prefers-reduced-motion`. **Onda 1 é
100% CSS sobre o stack atual (CRA), sem novas dependências e sem custo.** Ativos gerados
via Higgsfield são desenhados aqui mas ficam na Onda 2, atrás de um gate de orçamento
explícito.

## Critérios de aceite

> Nota: "verificação visual documentada" = checklist manual do Andre (não há harness de
> pixel neste projeto). Os ACs de código puro (AC-6, AC-7) têm gate executável.

### AC-1: Motion tokens padronizados
- **Dado** a base de estilos global (bloco `<style>` de `App.jsx` / `G`)
- **Quando** qualquer entrada, hover ou loop ambiente é definido
- **Então** usa os tokens compartilhados: entrada `cubic-bezier(0.16,1,0.3,1)`, hover
  `cubic-bezier(0.65,0,0.35,1)`, micro-interação 150–250ms, entrada 300–600ms, loop
  3–8s, stagger 40–100ms — animando **apenas `transform`/`opacity`** (glow/shadow via
  pseudo-elemento, nunca animando `box-shadow` direto)

### AC-2: Tela de login com movimento coeso
- **Dado** a tela de login carregada
- **Então** (verificação visual documentada): lista de recursos entra em **stagger**
  (fade+slide-up, 60–90ms); o anel de runas do logo **desenha-se** e passa a respirar;
  campo de formulário no `:focus` desenha a linha inferior dourada; o botão "Acessar o
  Nexus" tem shimmer em loop lento + estados de hover/click; o carrossel de depoimentos
  tem crossfade e **progress dots** (preenchem com o tempo, não bolinha binária)

### AC-3: Tela de seleção de sistema com movimento coeso
- **Dado** a tela de seleção
- **Então** (verificação visual documentada): cards entram em stagger (fade+slide-up,
  60–80ms); hover eleva o card (`translateY(-6px)`) e acende o glow **na cor do próprio
  sistema**; a seta "Acessar" desliza à direita; cards indisponíveis (`available:false`)
  usam shimmer de skeleton (não parecem só desabilitados)

### AC-4: Dashboard com movimento coeso
- **Dado** o dashboard/fichas
- **Então** (verificação visual documentada): o indicador de nav ativo **transiciona**
  entre itens (não troca seco); o card de personagem tem tilt/parallax sutil e anel de
  glow no accent do sistema ativo; status ONLINE respira; selo PRO tem shimmer;
  estados vazios/carregando usam skeleton com shimmer; troca entre seções é crossfade
  (não corte seco)

### AC-5: `prefers-reduced-motion` respeitado
- **Dado** o SO/navegador com "reduzir movimento" ativo
- **Quando** qualquer das 3 telas carrega
- **Então** parallax, partículas, tilt e loops ambientes são **desligados**; só
  permanecem fades simples e mudanças de estado essenciais — verificável por um bloco
  `@media (prefers-reduced-motion: reduce)` global que neutraliza as animações não
  essenciais

### AC-6: Accent por sistema com fonte única
- **Dado** o array `SYSTEMS` (seleção) e o registry `themes/index.js` (dentro do sistema)
- **Quando** um sistema é apresentado num card e depois aberto
- **Então** a cor de accent do card **deriva do mesmo registry** que tematiza o sistema
  por dentro — não há mais divergência (hoje D&D = azul no card, vermelho no tema). Uma
  única fonte governa card + tema.
- **Gate:** teste unitário garantindo `SYSTEMS[i].accent === getTheme(SYSTEMS[i].id).colors.accent`
  (ou que o card lê o accent via `getTheme`), rodando em `npm test`.

### AC-7: Helper de motion puro e testado
- **Dado** os tokens de motion e o stagger
- **Então** existe um módulo puro (ex.: `src/themes/motion.js`) exportando os tokens
  (`EASE_ENTER`, `EASE_HOVER`, durações) e um helper de atraso de stagger
  (`staggerDelay(index, step, base)`), **com testes** — para que timing seja
  configurável em um lugar e regressões sejam pegas por teste, não por olho.

## Matriz de decisão — motion por `prefers-reduced-motion`

| Elemento              | reduced-motion: no-preference | reduced-motion: reduce | AC   |
|-----------------------|-------------------------------|------------------------|------|
| Névoa/partículas/loop | ativo                         | **desligado**          | AC-5 |
| Parallax / tilt 3D    | ativo                         | **desligado**          | AC-5 |
| Stagger de entrada    | slide+fade                    | fade simples (ou nada) | AC-5 |
| Shimmer de botão/selo | loop                          | **estático**           | AC-5 |
| Estado de foco/hover  | ativo                         | ativo (essencial)      | AC-5 |
| Pulso ONLINE / status | ativo                         | reduzido/estático      | AC-5 |

## Casos de borda e erros

- Sistema sem entrada no registry (`getTheme` já faz fallback para `op`) → card usa o
  accent do fallback, nunca `undefined`.
- Navegador sem suporte a `@media (prefers-reduced-motion)` → comportamento padrão
  (movimento ativo); nenhuma quebra.
- `App.jsx` monolítico: mudanças de estilo devem ser **aditivas/cirúrgicas**; nenhuma
  tela fora das 3 de entrada pode regredir (build + suíte de testes existente verdes).

## Fora de escopo (vinculante)

- **Onda 2 (Higgsfield):** geração de imagem/vídeo/3D/áudio/voz e o pipeline
  `/public/assets/higgsfield/`. Desenhado no `design.md`, **não implementar** sem gate
  de orçamento aprovado pelo Andre.
- Migração para Vite ou adição de Framer Motion / tsparticles (decidido: puro CSS).
- Alterar Tormenta 20 para dourado (decidido: **mantém verde** do registry).
- Fichas de personagem, editor de mapa, backend/Firebase, i18n de novos textos.
- Reescrever/decompor `App.jsx` (é meta transversal de outra spec, não deste AC).

## Rastreabilidade

- Product: `./product.md` · Design: `./design.md`
- Fontes reconciliadas: `src/themes/index.js`, `src/App.jsx` (`SYSTEMS`, `SystemSelect`,
  `Dashboard`, keyframes L349–362), brief 2026-07-06.
- ADR a criar se a Onda 2 for aprovada (integração externa Higgsfield = decisão durável).
