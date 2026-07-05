---
name: tasks-interacao-jogador
description: Breakdown de tasks da interação do jogador na mesa. Puxe ao implementar a 0010.
alwaysApply: false
---

# Tasks — Mapa: interação do jogador

> Gate por task: `CI=true npm test -- --watchAll=false` + `npm run build`.

## Task 1 — permissions.js (puro) [AC-1, AC-7]
- `canMove(scene, el, uid, isMaster)`, `canCreate(scene, layerId, uid, isMaster)`,
  `canDelete(scene, el, uid, isMaster)` — espelham as rules (lock de elemento/camada,
  modos none/owner/all, mestre sempre pode).
- Teste `__tests__/permissions.test.js` com a matriz da AC-7.

## Task 2 — sync/live.js [AC-4, AC-5, AC-6]
- `makeLivePublisher(db, cid, uid, base)` → `{ publish(patch), clear(), destroy() }` com
  throttle 250ms (trailing) e payload `{ kind:'live', uid, at, ...base, ...patch }`.
- `subscribeLive(db, cid, cb)` (query kind=='live'), `isFresh(entry, now, staleMs=6000)`,
  `PING_MS=3000`; throttle puro exportado p/ teste.
- Teste `__tests__/live.test.js` (isFresh, throttle trailing).

## Task 3 — index.jsx: jogador interativo [AC-1, AC-4, AC-5]
- Toolbar do viewer: Selecionar/Régua/Apontar; fim do pointerEvents global.
- Guards: onElementDown/atalhos/ação-toolbar/ctx-menu respeitam `canMove` + viewer.
- Drag do próprio token: publica `updateElementPos` (novo helper no campaignSync2)
  com throttle 300ms + final no onUp; reducer local para feedback imediato.
- Duplo-clique → ping; ferramenta Apontar publica posição; régua publica linha.
- `PingsOverlay.jsx` renderiza pings/apontadores/réguas dos outros (nome+cor, staleness).

## Task 4 — index.jsx: controles do mestre [AC-2, AC-3, AC-6]
- Ctx menu do token: "Atribuir a…" (lê memberNames do doc da campanha; grava ownerId).
- Painel de camadas: ciclo de permissão update none→owner→all (persiste em permissions).
- Sync View: botão 📡 publica câmera; viewer segue (pan/zoom manual desliga; botão religa).

## Task 5 — Gates + validação manual
- Suíte + build verdes. Validação de mesa (2 navegadores, registrar aqui):
  [ ] jogador move só o próprio token · [ ] ping <1s · [ ] sync view segue/solta ·
  [ ] permissão desligada bloqueia próximo drag · [ ] rules negam drag de token alheio
  (console sem write concedido).

## Mapeamento AC → Task
| AC | Task(s) |
|---|---|
| AC-1 mover próprio token | 1, 3 |
| AC-2 reatribuir dono | 4 |
| AC-3 permissões por camada | 4 |
| AC-4 ping | 2, 3 |
| AC-5 apontador/régua | 2, 3 |
| AC-6 sync view | 2, 4 |
| AC-7 helpers testados | 1 |
