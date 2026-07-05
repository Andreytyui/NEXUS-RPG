---
name: tasks-fog-shapes
description: Breakdown de tasks da fog avançada. Puxe ao implementar a 0012.
alwaysApply: false
---

# Tasks — Mapa: fog avançada

> Gate por task: `CI=true npm test -- --watchAll=false` + `npm run build`.

## Task 1 — fog.js (puro) [AC-3, AC-6, AC-7, AC-8]
- `simplify(points, eps)` (Douglas-Peucker), `strokeToPoly(points, eps)` (fecha e arredonda,
  [] se <3 pts), `shapeBBox(s)`, `containsShape(outer, inner)` (rect/círculo exatos como
  contêiner — convexos, vértices bastam; poly como contêiner → false conservador),
  `pruneContained(shapes)` (só adds; pula par com cut entre eles na ordem),
  `pointInShape(s, x, y)` (poly por ray-casting), `hitFogShape(shapes, x, y)` (topmost).
- Teste `__tests__/fog.test.js` (inclui côncavo e cut intercalado).

## Task 2 — FogLayer.jsx [AC-4, AC-5, AC-9]
- React.memo; recebe `{ fog, mapW, mapH, gridHalf, asViewer, draft, selectedId }`.
- Move a mask sequencial inline do index.jsx; adiciona overlay do draft (polígono pendente
  com segmento até o cursor; traço livre) e contorno tracejado da forma selecionada.

## Task 3 — index.jsx: formas + edição + preview [AC-1..AC-7, AC-9]
- Estado: `fogShape` (rect|circle|poly|free, default rect), `fogEdit`, `fogSel`, `fogDraft`,
  `previewPlayer`; espelhar fogShape/fogEdit/fogSel no `stateRef`.
- `applyFogRect` → `applyFogDrag` (rect célula-alinhado + circle centro→raio, preview via
  PATCH ao vivo como hoje); traço livre acumula em ref e commita no onUp via `strokeToPoly`;
  polígono clique-a-clique (fechar: 1º ponto/duplo-clique/Enter; Esc cancela) com `fogDraft`.
- Commit sempre passa por `pruneContained` (dispatch extra só se mudou).
- Modo 🧽: clique → `hitFogShape` → seleção; Delete/botão apaga a forma.
- Toolbar de fog: ▭ ◯ ⬠ ✏ + 🧽 + 👁 (preview) + Célula ± (só no modo ▭).
- `asViewer = viewer || previewPlayer` nos 4 filtros hidden/spectre e na opacidade da fog.
- Duplo-clique fecha polígono pendente ANTES do ping.

## Task 4 — Gates + STATE.md
- Suíte (72 + fog.test.js) + build verdes. Validação de mesa (registrar):
  [ ] polígono do mestre visível ao jogador <2s · [ ] preview = viewer ·
  [ ] apagar forma reflete p/ todos · [ ] Esc cancela pendente.

## Mapeamento AC → Task
| AC | Task(s) |
|---|---|
| AC-1 círculo | 3 |
| AC-2 polígono | 3 |
| AC-3 traço livre | 1, 3 |
| AC-4 cut sequencial | 2 (render), manual |
| AC-5 preview | 2, 3 |
| AC-6 poda | 1, 3 |
| AC-7 edição | 1, 3 |
| AC-8 fog.js testado | 1 |
| AC-9 regressão zero | 2, 3 |
