---
name: tasks-0008-editor-owlbear
description: Plano de execução da spec 0008 (ordem, gate executável, status).
alwaysApply: false
---

# Tasks — 0008 editor nível Owlbear (fase 1)

> Gate executável: `npm test -- --watchAll=false` + `CI=false npm run build`.

- [x] **T1 — Desenho (AC-1):** tool 'draw' + modos/cor/espessura (barra inferior), preview ao
  vivo, elemento `drawing` (points normalizados ao bbox; x/y/w/h para drag/box-select), render
  SVG por camada, filtro viewer, box-select com centro por bbox p/ elementos com w/h.
- [x] **T2 — Token upgrades (AC-2/AC-3/AC-4):** upload/downscale 256px → `img_tok_*` no
  imageStore; render circular com borda na cor; presets P/M/G/E (criação + toolbar de seleção);
  `conditions[]` com badges + fileira de toggles no menu de contexto.
- [x] **T3 — Névoa por área (AC-5):** arrasto = retângulo de células (base imutável no
  mousedown, patch ao vivo), clique = célula única.
- [x] **T4 — Atalhos (AC-6):** V/T/D/F/R/N/M/G no keydown existente (guard input/viewer).
- [x] **T5 — Gate + docs:** testes + build verdes; STATE.md; commit + push + deploy hosting.
