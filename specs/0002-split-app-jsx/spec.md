---
name: spec-split-app-jsx
description: Contrato da feature split App.jsx. Base enquanto a feature está ativa.
alwaysApply: true
---

# Spec — Split de App.jsx

> **Fonte da verdade.** Status: aprovado

## Resumo

`App.jsx` é decomposto em três hooks custom (`useAuth`, `useCharacter`, `useCampaign`) em `src/hooks/`,
reduzindo o arquivo a < 400 linhas sem alterar nenhum comportamento visível ao usuário.

## Critérios de aceite

### AC-1: useAuth encapsula autenticação
- **Dado** que o usuário abre o app
- **Quando** o Firebase Auth emite um evento de mudança de estado
- **Então** `useAuth` retorna `{ currentUser, authLoading, userName, userPhoto, logout }` com os valores corretos

### AC-2: useCharacter encapsula personagens
- **Dado** um `uid` válido
- **Quando** `useCharacter(uid)` é montado
- **Então** carrega personagens do Firestore e retorna `{ characters, charsLoading, saveCharacter, deleteCharacter }`; `saveCharacter` persiste no Firestore e atualiza o estado local

### AC-3: useCampaign encapsula campanhas
- **Dado** um `uid` e `userName` válidos
- **Quando** `useCampaign(uid, userName)` é montado
- **Então** carrega campanhas do Firestore e retorna `{ campaigns, campsLoading, createCampaign, joinCampaign, leaveCampaign }`

### AC-4: função App() < 400 linhas
- **Dado** que os 3 hooks foram extraídos
- **Quando** se conta as linhas do corpo da função `App()` em `src/App.jsx`
- **Então** o corpo tem menos de 400 linhas

> **SPEC_DEVIATION registrada:** o alvo original era "arquivo < 400 linhas". Na realidade, App.jsx
> contém ~50 componentes definidos inline que não são responsabilidade desta feature (non-goal
> explícito: "não refatorar componentes filhos"). O alvo revisado mede apenas o orquestrador.

### AC-5: Zero regressão visível
- **Dado** qualquer fluxo existente (login, criar personagem, criar/entrar em campanha, ver ficha)
- **Quando** o usuário executa o fluxo após o split
- **Então** o comportamento é idêntico ao anterior (build compila, app funciona no browser)

### AC-6: Hooks testáveis isoladamente
- **Dado** um mock do Firebase (`jest.mock('firebase/auth')`, `jest.mock('firebase/firestore')`)
- **Quando** se testa `useAuth`, `useCharacter` ou `useCampaign` com `renderHook`
- **Então** cada hook tem pelo menos 1 teste unitário verde que valida seu contrato

## Casos de borda

- `uid` null/undefined passado para `useCharacter` ou `useCampaign` → não faz query no Firestore, retorna arrays vazios
- Erro de rede no Firestore → hook captura e não quebra o app; estado permanece no último valor válido
- Logout durante carregamento → `useCharacter` e `useCampaign` cancelam listeners e limpam estado

## Fora de escopo

- Refatorar componentes filhos (CampaignDetail, OrdemParanormalSheet, etc.)
- Migrar para TypeScript, Vite ou Context API
- Extrair utilitários `fsXxx` para arquivo separado (pode emergir, mas não é obrigatório neste PR)
- Alterar qualquer lógica de negócio existente

## Rastreabilidade

- Product: [./product.md](./product.md)
- Design: [./design.md](./design.md)
- Domínio: [./domain.md](./domain.md)
