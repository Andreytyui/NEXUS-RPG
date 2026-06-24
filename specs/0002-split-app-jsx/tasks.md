---
name: tasks-split-app-jsx
description: Breakdown de tasks do split de App.jsx. Puxe ao implementar os hooks.
alwaysApply: false
---

# Tasks — Split de App.jsx

> **Implementar na ordem das tasks.** Cada task tem um gate (`npm run build`) antes de continuar.

## Task 1 — Criar src/hooks/useAuth.js

**AC coberto:** AC-1, AC-6

### O que fazer
1. Criar `src/hooks/useAuth.js`
2. Mover de `App.jsx` para o hook:
   - `onAuthStateChanged` listener + estados `currentUser`, `authLoading`
   - Derivação de `userName` e `userPhoto` (a partir do `currentUser` ou Firestore)
   - Função `logout` (Firebase signOut)
3. Em `App.jsx`: substituir o bloco de auth pelo hook `const { currentUser, authLoading, userName, userPhoto, logout } = useAuth()`

### Gate
```bash
npm run build
```
Build deve compilar sem erros.

### Teste mínimo (AC-6)
Criar `src/hooks/__tests__/useAuth.test.js`:
- Mock `firebase/auth`
- `renderHook(() => useAuth())`
- Assert: retorna `{ currentUser: null, authLoading: false, userName: '', userPhoto: null, logout: fn }`

---

## Task 2 — Criar src/hooks/useCharacter.js

**AC coberto:** AC-2, AC-6

**Depende de:** Task 1 (uid vem do useAuth)

### O que fazer
1. Criar `src/hooks/useCharacter.js`
2. Assinatura: `useCharacter(uid)` → `{ characters, charsLoading, saveCharacter, deleteCharacter }`
3. Mover de `App.jsx`:
   - `fsLoadCharacters(uid)` → listener `onSnapshot` + estado `characters`
   - `fsSaveCharacter(char)` / `fsDeleteCharacter(id)` (mantém funções `fs*` em App.jsx por ora — o hook as chama)
4. Comportamento de borda: `uid` falsy → não faz query, retorna `characters: []`
5. Em `App.jsx`: substituir o bloco de characters pelo hook

### Gate
```bash
npm run build
```

### Teste mínimo (AC-6)
Criar `src/hooks/__tests__/useCharacter.test.js`:
- Mock `firebase/firestore`
- `renderHook(() => useCharacter(null))` → `characters === []`, `charsLoading === false`
- `renderHook(() => useCharacter('uid123'))` → listener montado

---

## Task 3 — Criar src/hooks/useCampaign.js

**AC coberto:** AC-3, AC-6

**Depende de:** Task 1, Task 2

### O que fazer
1. Criar `src/hooks/useCampaign.js`
2. Assinatura: `useCampaign(uid, userName)` → `{ campaigns, campsLoading, createCampaign, joinCampaign, leaveCampaign }`
3. Mover de `App.jsx`:
   - `fsGetUserCampaigns(uid)` → listener `onSnapshot` + estado `campaigns`
   - `fsCreateCampaign(...)` / `fsJoinCampaign(code, uid, userName)` / `fsLeaveCampaign(campId, uid)`
4. Comportamento de borda: `uid` falsy → não faz query, retorna `campaigns: []`
5. Em `App.jsx`: substituir o bloco de campanhas pelo hook

### Gate
```bash
npm run build
```

### Teste mínimo (AC-6)
Criar `src/hooks/__tests__/useCampaign.test.js`:
- Mock `firebase/firestore`
- `renderHook(() => useCampaign(null, ''))` → `campaigns === []`
- `createCampaign` / `joinCampaign` chamam Firestore com os parâmetros corretos

---

## Task 4 — Refatorar App.jsx para < 400 linhas

**AC coberto:** AC-4, AC-5

**Depende de:** Tasks 1, 2, 3

### O que fazer
1. Com os 3 hooks extraídos, App.jsx deve ter apenas:
   - Imports dos hooks e componentes
   - Chamadas `const { … } = useAuth()`, `useCharacter(uid)`, `useCampaign(uid, userName)`
   - Lógica de roteamento/rendering (qual tela mostrar)
   - Nenhuma função `fs*` ou estado de auth/character/campaign inline
2. Contar linhas: `wc -l src/App.jsx` ou inspecionar — deve ser < 400
3. Rodar o app no browser e testar manualmente: login, ver personagens, criar/entrar em campanha

### Gate
```bash
npm run build
# E testar no browser (npm start)
```

### Verificação de AC-4
```bash
node -e "const fs=require('fs'); const text=fs.readFileSync('src/App.jsx','utf8'); const lines=text.split('\n'); const start=lines.findIndex(l=>l.startsWith('export default function App()')); const count=lines.length-start; console.log(count,'linhas na função App()'); process.exit(count < 400 ? 0 : 1);"
```

---

## Task 5 — Rodar todos os testes e garantir cobertura

**AC coberto:** AC-6 (verificação final)

### O que fazer
1. Rodar suite completa:
   ```bash
   npm test -- --watchAll=false --ci --coverage --passWithNoTests
   ```
2. Os 3 testes unitários dos hooks devem estar verdes
3. Relatório de cobertura gerado em `coverage/`

### Gate
Todos os testes passam, zero falhas.

---

## Mapeamento AC → Task

| AC | Task(s) |
|---|---|
| AC-1: useAuth | Task 1 |
| AC-2: useCharacter | Task 2 |
| AC-3: useCampaign | Task 3 |
| AC-4: App.jsx < 400 linhas | Task 4 |
| AC-5: Zero regressão | Task 4 (teste manual) |
| AC-6: Hooks testáveis | Tasks 1, 2, 3, 5 |

## Rastreabilidade

- Spec: [./spec.md](./spec.md)
- Design: [./design.md](./design.md)
