---
name: tasks-0006-rules-fiel-ao-oficial
description: Plano de execução da spec 0006 (ordem, gate executável, status).
alwaysApply: false
---

# Tasks — 0006 rules.js fiel ao oficial

> Gate executável: `npm test -- --watchAll=false` +
> `npm test -- --watchAll=false --coverage --collectCoverageFrom=src/components/systems/OrdemParanormal/rules.js`
> (linhas ≥80% em rules.js) + `CI=false npm run build`.

- [x] **T1 — Testes ANTES (AC-1, AC-6):** criar
  `src/components/systems/OrdemParanormal/__tests__/rules.test.js` cobrindo:
  `nexLevel`, `nexStats` (3 classes × NEX 5/50/99, fallback de classe), `deriveStats`
  (peTurno 1/10/20, deslocamento oficial, defesa), novo `dtRituais` (exemplos oficiais 14 e 35 +
  bônus), `patenteForPrestigio` (0/19/20/50/100/200/999 e ausente), `cargaMaxima`,
  `defaultTrainedSet`, `rollOP` (atributo 0 ⇒ 2d20 pior; N dados melhor; crit), `rollExpr`
  (válido, modificador, inválido, limite 30 dados), `rollPayload`, `NEX_LADDER` (marcos AC-5),
  `PATENTES` (tabela oficial AC-4). Testes de dtRituais/deslocamento/patente **falham** até T2.
- [x] **T2 — rules.js (AC-2/AC-3/AC-4/AC-5):** adicionar `dtRituais(nex, attrs, bonus=0)`; corrigir
  `deriveStats.deslocamento` para 9m/6q; substituir `PATENTES`+`patenteForNex` pela tabela
  oficial + `patenteForPrestigio(pp)`; corrigir notas do `NEX_LADDER`; atualizar comentário de
  cabeçalho (não espelha mais o FullSheet no deslocamento).
- [x] **T3 — RituaisTab:** exibir DT calculada; trocar input manual por input de bônus
  (props `dtBase`/`dtBonus`/`setDtBonus`).
- [x] **T4 — OrdemParanormalSheet:** estado `dtRituaisBonus` com migração idempotente do
  `dtRituais` legado (bônus = salvo − base, só na primeira carga); persistir `dtRituaisBonus`
  e `dtRituais` = total calculado; `deslocamentoDisplay` = 9+bônus (sem AGI).
- [x] **T5 — InventarioTab:** `patenteForPrestigio(inv.pontos_prestigio)`; selo "PP" no lugar
  de "NEX x%".
- [x] **T6 — Gate + docs:** testes + cobertura ≥80% + build verdes; atualizar `docs/STATE.md`
  (F5 concluída, migração de máximos descartada com justificativa); commit + push + deploy
  hosting.

## Fora da esteira (registrado no STATE como backlog)
- Trilhas de Especialista faltantes (Infiltrador, Técnico).
- Revisão paráfrase × cópia dos textos de poderes (licença, junto com
  `src/data/ordemParanormal/*.json`).
