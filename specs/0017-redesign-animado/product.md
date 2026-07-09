---
name: product
description: PRD-lite do redesign animado (login/seleção/dashboard) — por quê e para quem. Puxe ao abrir a feature.
alwaysApply: false
---

# Product — Redesign animado (gótico-arcano)

> **Tier:** arquitetural · **Status:** rascunho · **Dono:** Andre
> Responde: **por quê** e **para quem**. Mantenha em 1 página.

## Problema

As três telas de entrada (login, seleção de sistema, dashboard) já têm identidade
visual gótica e **já animam** (16 keyframes, 221 usos de `animation`/`transition` em
`App.jsx`), mas o movimento é **desigual e sem intenção**: alguns elementos respiram,
outros são estáticos ao lado deles; não há stagger de entrada, foco de formulário
sem feedback, e a troca de tela é corte seco. Pior: o **accent por sistema tem duas
fontes divergentes** — o array `SYSTEMS` (tela de seleção) diz D&D = azul, mas o
`themes/index.js` (dentro do sistema) diz D&D = vermelho. O usuário percebe isso como
falta de acabamento, não como decisão de design. Para um produto de horror/RPG, a
primeira impressão perde o clima que o próprio conteúdo promete
("Nenhum horror se repete").

## Para quem

Todo visitante/usuário no funil de entrada (login → escolha de sistema → dashboard).
É a primeira e mais repetida superfície do produto — cada sessão passa por ela.

## Resultado esperado / métrica de sucesso

Percepção de acabamento "extremamente profissional" com **zero regressão de
performance** e **acessibilidade preservada**.
- Métrica: continuidade de movimento (todas as entradas com stagger + easing padrão),
  `prefers-reduced-motion` respeitado, e **uma única fonte de verdade** para o accent
  por sistema.
- Baseline: hoje 0 suporte a `prefers-reduced-motion`, 2 fontes de accent divergentes,
  movimento pontual → Alvo: reduced-motion coberto, 1 fonte de accent, movimento
  coeso nas 3 telas, `npm run build` verde e sem novas dependências (Onda 1).

## Goals

- Padronizar o motion (easings, durações, stagger) e cobrir as 3 telas de entrada.
- Reconciliar o accent por sistema numa fonte única (theming reativo intencional).
- Suporte a `prefers-reduced-motion` em todo movimento ambiente/parallax.
- **Onda 1 = puro CSS, zero dependências, zero créditos.**

## Non-goals

- Reescrever `App.jsx` ou migrar de CRA/Framer Motion (fora de escopo — ADR seria
  outro).
- Gerar ativos pagos no Higgsfield na Onda 1 (desenhado, mas **atrás de gate de
  orçamento** — Onda 2).
- Alterar as fichas de personagem (OP/D&D/Tormenta) ou o editor de mapa.

## Riscos / premissas

- **Premissa:** o clima gótico atual (gold global + accent por sistema) está aprovado
  e não muda — só ganha polimento e consistência.
- **Risco:** `App.jsx` é monolítico (~11,9k linhas); mudanças de CSS inline precisam
  ser cirúrgicas para não regredir telas fora de escopo.
