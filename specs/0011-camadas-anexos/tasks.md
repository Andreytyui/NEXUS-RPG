---
name: tasks-camadas-anexos
description: Breakdown de tasks do auto-grudar/anexos/z-order. Puxe ao implementar a 0011.
alwaysApply: false
---

# Tasks — Mapa: camadas Owlbear e anexos

> Gate por task: `CI=true npm test -- --watchAll=false` + `npm run build`.

## Task 1 — attach.js (puro) [AC-1, AC-2, AC-3, AC-5, AC-8]
- `ATTACH_RULES` (anexo→personagem, personagem→montaria), `anchorOf(el)`,
  `findAttachTarget(scene, elements, el, x, y)` (alvo topmost por z; ignora hidden/camada
  invisível/subárvore do próprio el), `subtreeIds(elements, rootId)` (cycle-safe),
  `wouldCycle(elements, childId, parentId)`, `dupSubtree(elements, rootId, idGen, offset)`.
- Teste `__tests__/attach.test.js`.

## Task 2 — reducer: apagar pai desanexa filhos [AC-4]
- `DELETE_ELEMENT`/`DELETE_ELEMENTS` anulam `parentId` dos órfãos na mesma ação.

## Task 3 — index.jsx: drag de subárvore + auto-grudar [AC-1, AC-2, AC-3]
- onElementDown expande o conjunto arrastado com descendentes (`subtreeIds`).
- onUp: com 1 raiz arrastada, `findAttachTarget` decide grudar/desanexar (`parentId`).
- Viewer: publica só elementos que `canMove` autoriza (subárvore filtrada).

## Task 4 — index.jsx: menu e z-order [AC-3, AC-5, AC-6, AC-7]
- Ctx menu (token e image): Desanexar (se parentId), Trazer para frente / Enviar para trás,
  Substituir imagem… (image); duplicar usa `dupSubtree`.
- Render ordena elementos por `z` dentro da camada.
- ~~Extrair `LayersPanel.jsx`~~ **ADIADA 2026-07-05** p/ fase seguinte (decomposição é meta
  transversal do plano, não AC desta spec; comportamento entregue completo).

## Task 5 — Gates + STATE.md
- Suíte + build verdes; validação de mesa (2 navegadores): [ ] anexo acompanha personagem ·
  [ ] montaria carrega subárvore · [ ] arrastar para fora desanexa · [ ] apagar pai preserva
  filhos · [ ] duplicar remapeia vínculos.

## Mapeamento AC → Task
| AC | Task(s) |
|---|---|
| AC-1/2/3 grudar/desanexar | 1, 3 |
| AC-4 órfãos | 2 |
| AC-5 dup subárvore | 1, 4 |
| AC-6 z-order | 4 |
| AC-7 substituir imagem | 4 |
| AC-8 attach.js testado | 1 |
