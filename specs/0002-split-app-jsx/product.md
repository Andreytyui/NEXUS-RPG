---
name: product-split-app-jsx
description: PRD-lite do split de App.jsx. Puxe ao discutir escopo ou prioridade desta feature.
alwaysApply: false
---

# Product — Split de App.jsx

> **Tier:** arquitetural · **Status:** aprovado · **Dono:** Andre

## Problema

`App.jsx` tem ~12 000 linhas e concentra autenticação, personagens, campanhas, UI e roteamento
num único arquivo. Isso causa:

- **Sem testabilidade:** impossível testar `useAuth` ou `useCampaign` isoladamente.
- **Risco de regressão elevado:** uma edição pode afetar qualquer outra parte — como os bugs de campanha desta semana.
- **Onboarding lento:** agentes precisam carregar o arquivo inteiro para entender qualquer contexto.

## Para quem

Andre — desenvolvedor único. Impacto imediato em toda sessão de desenvolvimento.

## Resultado esperado / métrica de sucesso

- **Métrica:** linhas em `App.jsx`
- **Baseline:** ~12 000 linhas → **Alvo:** < 400 linhas (orquestrador puro)
- **Proxy:** hooks `useAuth`, `useCampaign`, `useCharacter` com pelo menos 1 teste unitário cada

## Goals

- Extrair `useAuth` — currentUser, login, logout, loading de auth
- Extrair `useCharacter` — CRUD de personagens, fsLoadCharacters, fsSaveCharacter
- Extrair `useCampaign` — CRUD de campanhas, fsGetUserCampaigns, fsJoinCampaign, fsCreateCampaign
- `App.jsx` vira orquestrador: importa hooks, decide tela, nada mais

## Non-goals

- Não mudar comportamento visível — zero regressão
- Não migrar para TypeScript neste PR
- Não migrar para Vite neste PR
- Não refatorar componentes filhos (CampaignDetail, OrdemParanormalSheet…)
- Não criar Context API / Redux

## Riscos / premissas

- **Premissa:** comportamento externo não muda — qualquer regressão visível é bloqueante
- **Risco:** hooks com onSnapshot precisam retornar cleanup — omitir quebra listeners em silêncio
- **Risco:** dependências entre hooks (useCampaign lê currentUser) — resolver por parâmetro, não import circular
