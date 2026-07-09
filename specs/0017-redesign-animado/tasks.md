---
name: tasks
description: Decomposição e gates do redesign animado. Puxe ao implementar (após aprovação do design.md).
alwaysApply: false
---

# Tasks — Redesign animado (gótico-arcano)

> Cada task mapeia AC(s) e tem gate executável. `[P]` = paralelizável.
> **Não iniciar antes do `design.md` aprovado** (tier arquitetural). Um commit por task.

## Plano — Onda 1 (CSS puro, sem custo)

| #  | Task                                                        | Cobre AC | Depende de | Gate (comando)                                   | Status |
|----|-------------------------------------------------------------|----------|------------|--------------------------------------------------|--------|
| 1  | `src/themes/motion.js` — tokens + `staggerDelay` + testes   | AC-1,7   | —          | `npm test -- motion`                             | todo   |
| 2  | Bloco global de keyframes/utilitárias + `@media reduced-motion` no `<style>` de `G` | AC-1,5 | 1 | `npm run build` (verde)                          | todo   |
| 3  | Reconciliar accent: `SYSTEMS` deriva de `getTheme` + teste  | AC-6     | —          | `npm test -- systems-accent`                     | todo   |
| 4  | Login: stagger, underline no focus, shimmer, progress dots  | AC-2     | 2          | `npm run build` + checklist visual login         | todo   |
| 5  | SystemSelect: stagger, hover glow por sistema, skeleton `[P]`| AC-3     | 2,3        | `npm run build` + checklist visual seleção        | todo   |
| 6  | Dashboard: nav animada, tilt, crossfade, skeletons `[P]`    | AC-4     | 2,3        | `npm run build` + checklist visual dashboard      | todo   |
| 7  | Guard JS do tilt/parallax por `matchMedia` reduced-motion   | AC-5     | 2,6        | checklist com "reduzir movimento" ligado          | todo   |
| 8  | Regressão: suíte completa + build verdes, telas fora de escopo intactas | todos | 4,5,6,7 | `npm test` + `npm run build`                | todo   |

## Plano — Onda 2 (Higgsfield, GATED — não iniciar sem orçamento aprovado)

| #  | Task                                                        | Cobre AC | Depende de | Gate                                             | Status |
|----|-------------------------------------------------------------|----------|------------|--------------------------------------------------|--------|
| 9  | ADR da integração Higgsfield (decisão durável)              | —        | Onda 1     | ADR em `docs/architecture/adr/`                  | bloqueado |
| 10 | `balance` + confirmar orçamento + conjunto mínimo (fog, emblema OP, loop névoa) | — | 9 | aprovação explícita do Andre por chamada | bloqueado |
| 11 | Baixar → `public/assets/higgsfield/` → otimizar (`.webp`/`.webm`) + poster | — | 10 | assets versionados + fallback estático | bloqueado |
| 12 | Integrar assets nas telas (com reduced-motion + poster)     | AC-2,3   | 11         | checklist visual + Lighthouse sem regressão      | bloqueado |

## Plano de teste

- Unidade: `motion.js` (tokens presentes, `staggerDelay` monotônico/clamp); `systems-accent`
  (card accent === `getTheme(id).colors.accent`).
- Integração: `npm run build` verde a cada task de UI.
- Aceite: AC-1/6/7 por teste executável; AC-2/3/4/5 por checklist visual documentado
  (padrão do projeto p/ UI, como nas specs do mapa).

## Checklist visual (ACs de UI)

- [ ] Login: recursos em stagger · anel de runas desenha+respira · underline no focus ·
      shimmer do botão · progress dots
- [ ] Seleção: cards em stagger · hover eleva + glow na cor do sistema · seta desliza ·
      indisponível com skeleton
- [ ] Dashboard: nav ativa transiciona · tilt no card · ONLINE respira · PRO shimmer ·
      skeletons · crossfade entre seções
- [ ] Reduced-motion ligado: parallax/tilt/loops OFF, só fades essenciais
- [ ] Nenhuma tela fora de escopo (fichas/mapa) regrediu

## Divergências (SPEC_DEVIATION)

- [ ] (registrar aqui se surgir)

## Checklist de Definition of Done (Onda 1)

- [ ] AC-1/6/7 verdes pelo gate executável (`npm test`)
- [ ] AC-2/3/4/5 verdes pelo checklist visual documentado
- [ ] `npm run build` verde · suíte existente sem regressão
- [ ] Nenhum `SPEC_DEVIATION` pendente
- [ ] `docs/STATE.md` atualizado (próximo passo / decisões)
- [ ] Q1 (accent OP) resolvida antes da task 3
