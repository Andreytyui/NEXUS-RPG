---
name: tasks-mapa-dados-v2
description: Breakdown de tasks da fundação v2 do mapa. Puxe ao implementar a 0009.
alwaysApply: false
---

# Tasks — Mapa: fundação de dados v2

> Ordem obrigatória. Gate por task: `CI=true npm test -- --watchAll=false` + `npm run build`.

## Task 1 — schema.js + migrations.js (puros) [AC-1, AC-2]
- `schema.js`: `SCHEMA_V=2`, `DEFAULT_LAYERS_V2` (7 camadas), `defaultGrid()`, `defaultFog()`,
  `defaultPermissions()`, `newScene()`, `newElementId()`.
- `migrations.js`: `migrateSceneV2(scene)` (pura: remap camadas, notas→layer-note, ownerId/
  parentId/z/rotation, fogCells→`fogCellsToShapes`, gridSize→grid, permissions, schemaV:2);
  `fogCellsToShapes(cells, gridSize)` com merge horizontal por linha.
- `reducer.js`: `migrateScene` ganha fase 3 (chama `migrateSceneV2`); `ADD_SCENE`/estado
  inicial usam `newScene()`.
- Testes: `__tests__/migrations.test.js` (remap de camadas, fog merge, idempotência,
  cena v1 legada completa).

## Task 2 — grid.js (math pura) [AC-6]
- `cellSize(scene)`, `snapPoint(scene, x, y)`, `cellRect(scene, c, r)`, `measure(scene, a, b)`
  (euclidiana; fórmulas novas só na 0014). index.jsx passa a usar `scene.grid.size`.

## Task 3 — sync v2 [AC-3, AC-4]
- `sync/elementDiff.js` (puro): `diffElements(prevById, nextById)` → `{adds, updates, deletes}`;
  `chunkOps(ops, 400)`. Teste `__tests__/elementDiff.test.js`.
- `sync/campaignSync2.js`: `subscribeMapState`, `subscribeScenes` (query kind=='scene'),
  `subscribeElements(sceneId)`, `getImage` (getDoc+cache), `saveSceneMeta`, `publishElements`
  (batch chunked), `setActiveScene`, `createScene`, `deleteScene`, `migrateFirestoreV2`
  (idempotente, tombstone, chunks), `saveImage` (reuso do downscale; ids `img_a_<hash16>`,
  `hashDataUrl` via crypto.subtle com fallback).

## Task 4 — index.jsx: integração v2 [AC-1, AC-3, AC-4, AC-6]
- Substituir efeitos v1 (subscribe/autosave/upload) pelo fluxo v2: migração lazy do mestre →
  state → cena ativa → elements → montagem (ordenar por z) → LOAD_SCENES.
- Autosave v2: meta (debounce 1s) + elementos (elementDiff, debounce 300ms).
- Painel de cenas no modo campanha (mestre): criar/renomear/apagar/ativar.
- Fog: ferramentas atuais gravam shapes rect (add/cut); render por SVG mask; "Cobrir tudo" =
  fillAll, "Revelar tudo" = limpa. `applyFogRect` vira produtor de shapes.
- Remover `campaignSync.js` v1 + teste antigo de `splitMapDocs`.

## Task 5 — firestore.rules v2 [AC-5]
- `map/{docId}`: read membro; write mestre; exceção `live_` + uid próprio (membro).
- `map/{sceneId}/elements/{elId}`: read membro; write mestre; create/update/delete de membro
  gated por `permissions` da cena (get) + `ownerId` + `affectedKeys(['x','y','rotation'])`.
- Deploy: `firebase deploy --only firestore:rules` **ANTES** do deploy do app.
- Validação manual (registrar aqui): [ ] jogador não escreve cena/state/img · [ ] jogador
  não move token alheio · [ ] update próprio só x/y/rotation · [ ] live_{uid} só o próprio.

## Task 6 — Gates finais + STATE.md
- Suíte completa + build verdes; contagem de linhas de index.jsx (meta transversal <500 ao fim
  do plano — não é gate desta fase); STATE.md atualizado.

## Mapeamento AC → Task
| AC | Task(s) |
|---|---|
| AC-1 migração Firestore | 1, 3, 4 |
| AC-2 migração localStorage | 1 |
| AC-3 multi-cena | 3, 4 |
| AC-4 escrita incremental | 3, 4 |
| AC-5 rules | 5 |
| AC-6 paridade visual | 1, 2, 4 |
