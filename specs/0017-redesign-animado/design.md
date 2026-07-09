---
name: design
description: Technical Design Doc do redesign animado — motion CSS puro (Onda 1) + pipeline Higgsfield gated (Onda 2). Puxe ao implementar.
alwaysApply: false
---

# Technical Design Doc — Redesign animado (gótico-arcano)

> **Tier:** arquitetural · **Status:** rascunho (aguardando aprovação do Andre)
> **Autor:** Claude · **Revisores:** Andre · **Data:** 2026-07-06
> Responde: **como** no nível de sistema. **Aprovação obrigatória antes de implementar.**

## Links e artefatos

| Artefato                 | Onde          | Link                                     |
|--------------------------|---------------|------------------------------------------|
| Spec · Product           | repositório   | `./spec.md` · `./product.md`             |
| Brief original           | conversa      | "Redesign Animado da Nexus" (2026-07-06) |
| Registry de tema         | repositório   | `src/themes/index.js`                    |
| Telas alvo               | repositório   | `src/App.jsx` (`SystemSelect`, `Dashboard`, login) |

## Contexto da funcionalidade

O brief foi escrito a partir de **screenshots**, sem acesso ao código, e por isso parte
de premissas falsas que este design corrige explicitamente:

| Premissa do brief | Realidade no repo | Consequência |
|-------------------|-------------------|--------------|
| "purple do dashboard é um bug de consistência" | Theming reativo por sistema **já existe** (`themes/index.js` + `ThemeProvider`) | O insight já está entregue; falta **unificar** as 2 fontes de accent |
| "interface estática, zero animação" | 16 keyframes + 221 usos de `animation`/`transition`; `intro.mp4` ambiente já wired | Trabalho é **polir/padronizar**, não construir do zero |
| "stack: Vite + Framer Motion + tsparticles" | **CRA (react-scripts)**, deps = só `firebase`+`react` | Onda 1 = **puro CSS, zero deps** (decidido) |
| "Tormenta = dourado solar" | Registry ship **verde** (verdant Arton) | Mantém verde (decidido) |
| "`/public/assets/higgsfield/`" | Não existe; `public/` tem `intro.mp4`, `Logo Nexus.jpg` | Pipeline de assets é **Onda 2, gated** |

## Goals / Non-goals

**Goals**
- Tokens de motion únicos (easing/duração/stagger) reutilizados nas 3 telas.
- Fonte única de accent por sistema (reconciliar `SYSTEMS` ↔ `themes/index.js`).
- `prefers-reduced-motion` global.
- Onda 1 sem novas dependências, sem custo, `build`+testes verdes.

**Non-goals**
- Framer Motion / Vite / tsparticles; decompor `App.jsx`; gerar assets pagos na Onda 1.

## Glossário (da funcionalidade)

| Termo             | Descrição                                                        |
|-------------------|------------------------------------------------------------------|
| Motion token      | Constante de easing/duração/stagger compartilhada (`themes/motion.js`) |
| Accent por sistema| Cor-tema de cada RPG; **fonte única** = `themes/index.js.colors.accent` |
| Onda 1            | Polimento de motion 100% CSS, sem custo                          |
| Onda 2            | Ativos gerados no Higgsfield, atrás de gate de orçamento         |
| Loop ambiente     | Animação contínua de fundo (névoa/brasa/shimmer), 3–8s           |

## Design proposto

### Onda 1 — motion CSS puro (implementável já)

1. **`src/themes/motion.js` (novo, puro + testado).** Exporta `EASE_ENTER`,
   `EASE_HOVER`, durações (`DUR_MICRO`, `DUR_ENTER`, `DUR_LOOP`) e
   `staggerDelay(i, step=70, base=0)`. Ponto único de timing (AC-1, AC-7).

2. **Bloco global de keyframes/utilitárias** no `<style>` já existente do componente `G`
   (onde vivem os keyframes L349–362). Adicionar (aditivo, sem remover os atuais):
   `stagger-in`, `focus-underline`, `btn-shimmer`, `progress-dot`, `card-tilt` helpers,
   e o **override de reduced-motion** (AC-5). Nada de `box-shadow` animado: glow via
   `::before/::after` com `opacity`.

3. **Login** (região do logo + form + carrossel): aplicar classes utilitárias — anel de
   runas reaproveita `sigil-pulse` (já existe), lista de recursos ganha `stagger-in` com
   `staggerDelay`, inputs ganham underline no `:focus`, botão ganha `btn-shimmer`,
   dots do carrossel viram `progress-dot` (AC-2).

4. **`SystemSelect`** (`App.jsx` L6489): stagger nos cards, hover `translateY(-6px)` +
   glow no accent do próprio sistema, seta desliza, cards `available:false` com skeleton
   shimmer (AC-3).

5. **Reconciliação de accent (AC-6).** O array `SYSTEMS` deixa de hardcodar
   `accent/accentText/accentGlow`; passa a derivá-los de `getTheme(id).colors`
   (`accent`, `accent2`, e um glow derivado). Teste garante igualdade card↔tema.
   > **Questão em aberto Q1:** OP hoje = card magenta `#b030d8` vs tema gold `#c9a84c`
   > (com purple secundário). Definir se o card OP passa a **gold** (fonte única estrita)
   > ou mantém o **arcano roxo** como accent do card (então o registry ganha um campo
   > `cardAccent` explícito). Andre decide no review.

6. **`Dashboard`** (`App.jsx` L4554): indicador de nav com transição de posição
   (CSS `transition` no underline/pílula), tilt sutil no card de personagem
   (`transform` via var CSS setada no `onMouseMove`, respeitando reduced-motion),
   ONLINE/PRO reaproveitam `live-dot`/`shimmer`, skeletons com `skeletonPulse`
   (já existe), crossfade nas seções (AC-4).

7. **`prefers-reduced-motion` (AC-5):** um único `@media (prefers-reduced-motion: reduce)`
   global zera `animation`/`transition` dos loops/parallax e neutraliza o tilt (o
   handler JS checa `matchMedia('(prefers-reduced-motion: reduce)')` antes de setar a
   var de tilt).

### Onda 2 — ativos Higgsfield (desenhada, GATED)

Só executa após aprovação de orçamento explícita. Fluxo: `balance` → confirmar créditos
→ gerar **conjunto mínimo** (fog texture, emblema OP, loop de névoa) → revisar
consistência → baixar para `public/assets/higgsfield/{img,video,3d,audio}/` → otimizar
(`.webp`/`.webm`) → só então expandir. Todo `<video>` de fundo precisa de poster estático
e é desligado sob reduced-motion. **Nenhuma URL do Higgsfield é hotlinkada** (expira).

## Cobertura dos 5 eixos

### 1. Tech stack
Onda 1: **nenhuma dependência nova** — CSS + um módulo JS puro. CRA mantido. Onda 2:
conector MCP Higgsfield (externo, pago, aprovação por chamada) — **decisão durável → ADR
no início da Onda 2**.

### 2. Arquitetura base
Onda 1 respeita a camada de interface (`App.jsx`) + `themes/` (já é a borda de tema). O
novo `themes/motion.js` é irmão de `themes/index.js` (sem dependência de framework/IO,
coerente com a regra de dependência). Nenhuma fronteira nova.

### 3. Infra
Onda 1: zero infra nova; reversão = reverter o commit (mudanças aditivas de CSS).
Onda 2: assets versionados em `public/` aumentam o bundle estático (avaliar tamanho);
reversão = remover assets + o `<video>`/`<img>` que os referencia.

### 4. Qualidade
Gates executáveis onde há lógica: `motion.test.js` (AC-7) e `systems-accent.test.js`
(AC-6) em `npm test`; `npm run build` verde; suíte existente (13 suítes/92 testes) sem
regressão. ACs visuais (AC-2/3/4/5) = checklist manual documentado (não há harness de
pixel — coerente com o padrão do projeto para o mapa).

### 5. Observabilidade
Sem telemetria de produto neste momento (não há analytics no repo). "Prova" da Onda 1 =
build+testes verdes + checklist visual + Lighthouse local (sem regressão de performance).

## Mapa de dependências

| Dependência        | Tipo       | Descrição                        | Métodos-chave |
|--------------------|------------|----------------------------------|---------------|
| `themes/index.js`  | módulo     | fonte única de accent por sistema| `getTheme(id).colors.accent` |
| `matchMedia`       | Web API    | detectar reduced-motion no JS    | `matchMedia('(prefers-reduced-motion: reduce)')` |
| Higgsfield MCP (O2)| serviço ext| gerar assets (pago, gated)       | `balance`, `generate_image/_video/_3d`, `job_status` |

## Solução

| # | Bloco                                  | Descrição                                  | Status     |
|---|----------------------------------------|--------------------------------------------|------------|
| 1 | `themes/motion.js` + teste             | tokens + `staggerDelay`                    | definido   |
| 2 | Keyframes/utilitárias globais + RM     | bloco aditivo no `<style>` de `G`          | definido   |
| 3 | Login motion                           | stagger, underline, shimmer, progress dots | definido   |
| 4 | SystemSelect motion                    | stagger, hover glow, skeleton              | definido   |
| 5 | Reconciliação de accent + teste        | `SYSTEMS` deriva de `getTheme`             | definido   |
| 6 | Dashboard motion                       | nav, tilt, crossfade, skeletons            | definido   |
| 7 | `prefers-reduced-motion` global        | media query + guard JS do tilt             | definido   |
| 8 | Onda 2 — assets Higgsfield             | pipeline gated por orçamento               | indefinido |

## Alternativas consideradas

| Alternativa                    | Prós | Contras | Por que (não) |
|--------------------------------|------|---------|---------------|
| A (escolhida): CSS puro no CRA | zero deps, zero custo, reversível, cobre ~80% do brief | tilt/parallax exigem um pouco de JS manual | **escolhida** — cabe no stack, sem risco |
| B: adicionar Framer Motion     | layout animations "de graça" (nav shared-layout) | nova dep + bundle em CRA; decisão irreversível-ish | recusada nesta onda |
| C: gerar assets Higgsfield já  | wow visual imediato | custo por chamada, sem revisão de estilo antes | recusada — vira Onda 2 gated |

## Trade-offs e consequências

Ganhamos acabamento e consistência sem custo e sem risco de dependência; aceitamos
implementar tilt/parallax "na mão" (pouco JS) e adiar o wow dos ativos gerados para a
Onda 2. Dívida consciente: o motion nasce dentro do `<style>` monolítico de `App.jsx`
(coerente com o padrão atual); extrair para CSS modules é problema de outra spec.

## Riscos

| Risco                          | Descrição                          | Prob × Impacto | Mitigação |
|--------------------------------|------------------------------------|----------------|-----------|
| Regressão em tela fora de escopo | CSS global vazando p/ fichas/mapa | médio × alto   | classes/escopos novos, nada de seletor genérico; build+suíte verdes |
| Custo Higgsfield estourar      | gerar demais sem revisar           | médio × médio  | gate de orçamento + conjunto mínimo + revisar antes de expandir (Onda 2) |
| Reduced-motion incompleto      | esquecer um loop                   | baixo × médio  | override global por `@media`, não por elemento |
| Q1 (accent OP) não resolvida   | fonte única ambígua p/ OP          | alto × baixo   | decidir no review antes de codar o bloco 5 |

## Roadmap da feature

| Fase        | Entrega                                   | Quando       | Depende de |
|-------------|-------------------------------------------|--------------|------------|
| 1 (MVP)     | Motion CSS + accent único + reduced-motion (AC-1..7) | após aprovação deste doc | — |
| 2           | Ativos Higgsfield (conjunto mínimo → expandir) | após gate de orçamento | 1 + ADR |

## Questões em aberto

- [x] **Q1 — accent do card OP:** RESOLVIDA (2026-07-06, Andre) → **manter arcano roxo**.
      O registry ganha um campo `cardAccent` (fallback para `accent`); OP card usa
      `cardAccent` (`#b030d8`), enquanto o chrome dentro do sistema segue `accent` (gold).
      Roxo vira sinal deliberado do "Outro Lado", não bug. D&D/Tormenta: `cardAccent`
      omitido → caem no `accent` do tema (vermelho/verde).
- [ ] **Q2 — orçamento Onda 2:** quantos créditos Higgsfield autorizados e quais itens
      do conjunto mínimo? (decidir só ao abrir a Onda 2.)

> Se a Onda 2 for aprovada, a integração externa Higgsfield vira **ADR** em
> `docs/architecture/adr/` (decisão durável) antes de qualquer geração.
