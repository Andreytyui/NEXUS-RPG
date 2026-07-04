---
name: adr-0005-mapa-da-mesa-no-firestore
description: Decisão — o MapEditor (cenas/elements) é o motor oficial do mapa da mesa, sincronizado via Firestore; tile-based aposentado. Puxar ao mexer em mapa/VTT.
alwaysApply: false
---

# ADR 0005 — Mapa da mesa: MapEditor + Firestore (aposenta o tile-based)

- **Status:** aceito (missão SaaS F6, 2026-07-04) — pendente de ratificação do Andre
- **Contexto:** existiam DOIS sistemas de mapa: (a) o tile-based do `CampaignMapTab` (App.jsx),
  multiplayer via `campaigns/{id}/map/current`, porém primitivo (tiles coloridos); (b) o novo
  MapEditor estilo Owlbear (`src/components/MapEditor/`), muito superior (imagens, tokens,
  camadas, fog por célula, undo/redo), porém **local-only** (localStorage). Auditoria FASE 0
  apontou a duplicação como risco.

## Decisão
1. **O MapEditor é o único motor do mapa da mesa.** O tile-based é removido do
   `CampaignMapTab` (aposentado; o doc legado `map/current` fica órfão e é ignorado).
2. **Modelo de dados** na subcoleção já coberta pela regra F2 (`match /map/{docId}`):
   - `campaigns/{id}/map/scene` → `{ engine:'scene', scene:{ id, name, layers[], elements[],
     fogCells[], gridSize, bgSize }, updatedAt, updatedBy }` (cena ativa da mesa; JSON pequeno —
     elements referenciam imagens por `imageId`).
   - `campaigns/{id}/map/img_<ts>` → `{ kind:'image', data:<dataURL JPEG reduzido>, updatedAt }`
     (uma imagem por doc; downscale ~1600px/0.82 e re-tentativa 1200px/0.7 para caber no limite
     de 1 MB/doc do Firestore).
3. **Fluxo:** mestre edita (autosave debounced ~1.2s, last-write-wins); jogadores assinam
   `onSnapshot` da subcoleção e veem ao vivo em modo leitura (fog opaca, elementos
   `hidden`/`spectre` invisíveis, só pan/zoom).
4. **Escrita gated no cliente** (mestre): a regra Firestore atual permite escrita a qualquer
   membro — endurecer para mestre-only nas rules é backlog consciente (exige `masterId` no doc
   da campanha acessível à rule).

## Alternativas rejeitadas
- **Firebase Storage para imagens:** app inteiro já usa dataURL no Firestore (avatares);
  adicionar Storage = nova superfície de billing/rules para v1 do mapa.
- **Migrar o tile-based para o MapEditor:** dados de tiles não têm equivalente visual no novo
  motor; valor de migração ~zero (mapas de sessão são efêmeros).
- **RTDB/WebRTC para presença/cursores:** fora do escopo v1.

## Consequências
- `MapEditor` ganha modo campanha por props (`campaignId/uid/isMaster/db`) — sem campaignId
  segue 100% local (editor pessoal intocado).
- Undo/redo do mestre opera local e o resultado é publicado; jogador não tem histórico.
- Cena grande (muitas imagens) é limitada pelo teto de 1 MB/doc por imagem — aceitável para
  battlemaps JPEG reduzidos.
