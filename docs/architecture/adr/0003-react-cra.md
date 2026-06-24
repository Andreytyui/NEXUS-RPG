---
name: adr-0003-react-cra
description: ADR retroativo — React CRA como bundler. Puxe ao trabalhar em build, bundler ou migração para Vite.
alwaysApply: false
---

# ADR-0003: React com Create React App (CRA)

- **Status:** aceito
- **Data:** 2026-06-22 (retroativo — decisão tomada na origem do projeto)
- **Decisores:** Andre (Andrey Lucas de Andrade Nonardo)

## Contexto
Escolha do framework e bundler para a SPA. Projeto solo, foco em velocidade de entrega.
Não havia requisitos de SSR ou SSG.

## Decisão
Vamos usar React 18 com Create React App (react-scripts 5) como bundler.
JavaScript puro (sem TypeScript) para reduzir fricção inicial.

Alternativas descartadas: Next.js (SSR desnecessário para app autenticado), Vite (preferência
por conveniência do CRA na época).

## Consequências
- **+** Zero configuração de webpack; `npm start` funciona imediatamente
- **+** Hot reload, Jest integrado, ESLint pré-configurado
- **−** CRA está em modo de manutenção (descontinuado pela comunidade React)
- **−** Build lento em projetos grandes; sem suporte a ESM nativo
- **−** Sem TypeScript: erros de tipo só aparecem em runtime
- **−** Difícil de customizar sem eject agressivo

> Quando App.jsx for splitado e a base de testes estiver sólida, avaliar migração para Vite.
