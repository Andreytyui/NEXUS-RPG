---
name: adr-0004-inline-styles
description: ADR retroativo — inline styles como estratégia de estilização. Puxe ao trabalhar em componentes UI ou avaliar CSS-in-JS.
alwaysApply: false
---

# ADR-0004: Inline styles como estratégia de estilização

- **Status:** aceito
- **Data:** 2026-06-22 (retroativo — decisão tomada na origem do projeto)
- **Decisores:** Andre (Andrey Lucas de Andrade Nonardo)

## Contexto
Escolha da estratégia de estilização para uma SPA com tema dark gothic pesado, múltiplos
sistemas RPG com temas visuais distintos, e necessidade de estilos dinâmicos baseados em dados
(elemento do personagem, NEX, etc.).

## Decisão
Vamos usar inline styles (`style={{…}}`) em JavaScript puro para toda a estilização. Estilos
compartilhados por sistema ficam em arquivos `ordemStyles.jsx` e `modalStyles.js`.

Alternativas descartadas: Tailwind CSS (API de tema dinâmica mais difícil), styled-components
(overhead de bundle e complexidade), CSS Modules (sem suporte fácil a temas dinâmicos via JS).

## Consequências
- **+** Temas dinâmicos por elemento/sistema são triviais (são apenas objetos JS)
- **+** Sem conflito de especificidade CSS; estilos isolados por componente
- **+** Zero configuração adicional de build
- **−** Sem pseudo-elementos (`:hover`, `::before`) nativos — usa `onMouseEnter`/`onMouseLeave`
- **−** Sem media queries declarativas — responsividade fica em JS
- **−** Difícil de auditar visualmente (estilo misturado com lógica)
