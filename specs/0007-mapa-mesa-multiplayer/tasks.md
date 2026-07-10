---
name: tasks-0007-mapa-mesa-multiplayer
description: Plano de execução da spec 0007 (ordem, gate executável, status).
alwaysApply: false
---

# Tasks — 0007 mapa da mesa multiplayer

> Gate executável: `npm test -- --watchAll=false` + `CI=false npm run build`.
> (Sync com Firestore real é validado manualmente na mesa — sem emulador no projeto ainda.)

- [x] **T1 — reducer.js:** action `LOAD_SCENES` (substitui `present`, zera histórico) +
  `initialHistoryState('campaign')` ignora localStorage (cena vazia padrão).
- [x] **T2 — campaignSync.js (novo):** `subscribeCampaignMap(db,id,cbs)` (um onSnapshot na
  subcoleção `map`; separa doc `scene` de docs `img_*` via helper puro `splitMapDocs`),
  `saveScene(db,id,uid,scene)`, `saveImage(db,id,imageId,dataUrl)` com downscale
  (1600/0.82 → 1200/0.7 → aborta com alerta). Teste unitário de `splitMapDocs`.
- [x] **T3 — MapEditor/index.jsx modo campanha:** props `campaignId/uid/isMaster/db`;
  localStorage OFF em modo campanha; hidratação inicial + snapshot (mestre: só 1ª carga e
  ignora eco `hasPendingWrites`; jogador: aplica tudo); autosave debounced do mestre
  (cena + imagens novas); modo viewer (AC-2/AC-3): toolbar/painéis ocultos, overlay
  pan/zoom-only, fog opaca, hidden/spectre filtrados.
- [x] **T4 — App.jsx:** `CampaignMapTab` (2676–3046) substituído por launcher (status +
  "Abrir mesa tática") que monta `<MapEditor campaignId uid isMaster db onBack/>`;
  remover imports/constantes do tile-based que ficarem órfãos.
- [x] **T5 — Tipografia OP (AC-6):** `SYSTEM_THEMES.op.fonts` body→Inter, data→IBM Plex Mono
  (+googleFonts); 2 usos hardcoded de IM Fell no drawer OP do App.jsx → `var(--font-body)`.
- [x] **T6 — Gate + docs:** testes + build verdes; STATE.md; commit + push + deploy hosting;
  validação manual na mesa (2 navegadores) registrada no STATE.
