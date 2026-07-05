---
name: tasks-biblioteca-assets
description: Breakdown de tasks da biblioteca de assets. Puxe ao implementar a 0013.
alwaysApply: false
---

# Tasks — Mapa: biblioteca de assets

> Gate por task: `CI=true npm test -- --watchAll=false` + `npm run build`.

## Task 1 — assets/assetLib.js [AC-3, AC-5, AC-7]
- Puro: `ASSET_TYPES` (map/prop/mount/character/attachment/note), `layerForAssetType`
  (map→layer-map, prop→layer-prop, mount→layer-mount, character→layer-character,
  attachment→layer-attachment, note→layer-note), `assetTypeForElement(el, layers)`,
  `filterAssets(assets, {q, tag})` (nome case-insensitive + tag), `newAssetId`,
  `assetTags(assets)` (união ordenada). `ASSET_SOFT_CAP=300`.
- Firestore: `subscribeAssets(db, uid, cb)`, `saveAsset(db, uid, asset)`,
  `deleteAsset(db, uid, id)`.
- Teste `assets/__tests__/assetLib.test.js` (parte pura).

## Task 2 — rules users/{uid}/assets [AC-6]
- `match /users/{userId}/assets/{assetId} { allow read, write: if auth.uid == userId; }`.
- Deploy `firebase deploy --only firestore:rules` ANTES do app.

## Task 3 — AssetDock.jsx + index.jsx [AC-1..AC-5]
- `AssetDock.jsx`: abas por tipo, busca, chips de tag, grid de miniaturas; `draggable`
  + onClick → callback `onPlace(asset, worldPos?)`.
- index.jsx: botão da dock (🎒) na toolbar; `subscribeAssets`; `placeAsset` cria elemento na
  camada certa (image p/ mapa/prop/montaria; token c/ imageId p/ personagem/anexo; note),
  copiando a imagem via `saveImage(db, cid, null, data)` (dedup por hash — reusa 0009) e
  populando `imageStore`; modo pessoal grava direto no `imageStore`.
- Ctx menu (image/token com imagem): "🎒 Salvar na biblioteca" → reduz + `saveAsset` (respeita
  ASSET_SOFT_CAP); drop de asset da dock no canvas usa a posição do cursor.

## Task 4 — Gates + STATE.md + memória
- Suíte (83 + assetLib) + build verdes; deploy rules. Validação: [ ] salvar → aparece na dock ·
  [ ] arrastar cria elemento · [ ] mesmo asset 2× = 1 img_a doc · [ ] jogador vê · [ ] busca/tag.

## Mapeamento AC → Task
| AC | Task(s) |
|---|---|
| AC-1 salvar | 3 |
| AC-2 dock/reuso | 1, 3 |
| AC-3 colocar | 1, 3 |
| AC-4 dedup | 3 (reusa saveImage 0009) |
| AC-5 busca/tags | 1, 3 |
| AC-6 rules | 2 |
| AC-7 assetLib testado | 1 |
