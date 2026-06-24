---
name: design-split-app-jsx
description: Decisão de design do split de App.jsx — como extrair os hooks. Puxe ao implementar ou revisar arquitetura.
alwaysApply: false
---

# Design — Split de App.jsx

> **Status:** aprovado

## Solução

Estratégia **extract-and-delegate**: mover lógica de App.jsx para hooks custom em `src/hooks/`,
sem alterar comportamento externo. App.jsx passa a importar e delegar.

### Estrutura de destino

```
src/
  hooks/
    useAuth.js        ← autenticação (currentUser, login, logout, loading)
    useCharacter.js   ← personagens (characters, CRUD)
    useCampaign.js    ← campanhas (campaigns, CRUD)
  App.jsx             ← < 400 linhas: importa hooks + decide tela
```

### Contratos dos hooks

**`useAuth()`** → `{ currentUser, authLoading, userName, userPhoto, logout }`

**`useCharacter(uid)`** → `{ characters, charsLoading, saveCharacter, deleteCharacter }`

**`useCampaign(uid, userName)`** → `{ campaigns, campsLoading, createCampaign, joinCampaign, leaveCampaign }`

## Ordem de implementação (minimiza risco)

1. `useAuth` — mais isolado
2. `useCharacter(uid)` — depende só de `uid`
3. `useCampaign(uid, userName)` — depende de `uid` + `userName`
4. Refatorar App.jsx — substituir código inline pelos hooks

Cada passo: `npm run build` local antes de seguir.

## Alternativas descartadas

| Alternativa | Por que descartada |
|---|---|
| Context API + Provider | Mais complexo, hooks simples bastam agora |
| Redux / Zustand | Overkill para solo dev neste estágio |
| Rewrite completo | Alto risco de regressão; extract é incremental |
