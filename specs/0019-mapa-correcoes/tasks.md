---
name: tasks-0019-mapa-correcoes
description: Decomposição e gates das correções do Editor de Mapas. Puxe ao implementar.
alwaysApply: false
---

# Tasks — Correções do Editor de Mapas

> Um commit por grupo. Gate geral: `npm test -- --watchAll=false` + `npm run build` verdes.

| Grupo | Task | Cobre AC | Arquivos | Status |
|---|---|---|---|---|
| A | Camadas: toast de camada travada, reordenar (↑/↓ via `REORDER_LAYERS`), zIndex `layerIdx*1e5 + z`, furos de lock (clique/subtree) | AC-1/AC-2/AC-3/AC-4 | index.jsx, reducer.js | done |
| B | Seleção: `pointerEvents` de imagem/desenho por lock da camada | AC-5 | index.jsx | done |
| C | Ferramentas: limpar `measureLine` no up/esc; fog/opacity com commit único; wheel não-passivo; +/− e ⌂ centrados/fit; snap centralizado + default ON | AC-6/AC-7/AC-8/AC-9 | index.jsx | done |
| D | Persistência: catches com log+toast; downscale de fundo; `collectOrphanImageIds`+sweep | AC-10/AC-11 | index.jsx, reducer.js, imageQuota.js (novo) | done |
| E | Iconografia: `icons.jsx` SVG, substituir emojis nas toolbars/painéis | AC-12 | index.jsx, icons.jsx (novo) | done |
| F | Layout: toolbar direita compacta+scroll (não corta); painel esquerdo recolhível (« recolher / » alça de reabrir) | AC-13 | index.jsx, icons.jsx | done |

## Plano de teste
- Unidade (novos): `collectOrphanImageIds` (imageQuota.test.js), `cellSnapCenter` (snap centralizado),
  `layerZIndex(layerIdx, z)` (compute puro). Gate: `npm test -- --testPathPattern="MapEditor"`.
- Integração: `npm run build` verde; suíte existente (16/118) sem regressão.
- Aceite AC-1..9/12 (UI): checklist manual do Andre. AC-11 tem gate executável (orphan).

## Checklist manual (Andre)
- [ ] Destravar "Mapa" → arrastar/redimensionar o mapa funciona; travada → toast.
- [ ] ↑/↓ reordena camadas e muda empilhamento.
- [ ] Trazer p/ frente/enviar p/ trás tem efeito entre tipos.
- [ ] Clicar numa imagem/desenho (camada destravada) seleciona.
- [ ] Medir e soltar → régua some; seleção volta a mostrar a barra.
- [ ] Arrastar fog / slider de opacidade → 1 Ctrl+Z desfaz.
- [ ] Roda dá zoom no cursor sem rolar a página; +/− centram; ⌂ enquadra.
- [ ] Ícones legíveis; revelar ≠ visibilidade ≠ preview.

## Definition of Done
- [ ] Gates executáveis (orphan/snap/zindex) verdes em `npm test`
- [ ] `npm run build` verde · 16+ suítes sem regressão
- [ ] Nenhum `SPEC_DEVIATION` pendente
- [ ] `docs/STATE.md` atualizado
