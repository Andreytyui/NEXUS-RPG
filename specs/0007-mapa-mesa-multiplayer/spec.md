---
name: spec-0007-mapa-mesa-multiplayer
description: Contrato da feature (critérios de aceite). Base enquanto a feature está ativa.
alwaysApply: true
---

# Spec — Mapa da mesa multiplayer (F6 da missão SaaS)

> **Fonte da verdade.** Status: em implementação (Andre aprovou a direção na FASE 0:
> "MapEditor → Firestore multiplayer"; design/ADR 0005 pendentes de ratificação).
> Design: ver `docs/architecture/adr/0005-mapa-da-mesa-no-firestore.md` (modelo de dados,
> alternativas rejeitadas). Tier arquitetural.
>
> **Inclui nesta frente (pedido do Andre, 2026-07-04):** tipografia mais legível em TODO o
> sistema Ordem — exceto a fonte do nome do personagem ("ele está perfeito") — ver AC-6.

## Critérios de aceite

### AC-1: Mestre edita o mapa da mesa e persiste
- **Dado** o mestre na aba Mapas da campanha
- **Quando** abre a mesa tática e edita (tokens, imagens, fog, camadas)
- **Então** o MapEditor abre em modo campanha e cada mudança é salva (debounce ~1.2s) em
  `campaigns/{id}/map/scene`; imagens novas vão para `campaigns/{id}/map/img_*` reduzidas
  (max ~1600px JPEG; nunca acima do limite de doc do Firestore).

### AC-2: Jogador vê ao vivo, em modo leitura
- **Dado** um jogador membro da campanha com a mesa aberta
- **Quando** o mestre move um token / revela fog / troca a cena
- **Então** a visão do jogador atualiza via `onSnapshot` sem reload; o jogador só consegue
  pan/zoom (sem toolbar de edição, sem painel de camadas/cenas, sem context menu).

### AC-3: Fog e elementos ocultos escondem de verdade
- **Dado** células de fog e elementos com `hidden` ou `spectre`
- **Quando** um jogador visualiza a mesa
- **Então** fog renderiza opaca (≥0.97) e elementos hidden/spectre NÃO são renderizados;
  o mestre continua vendo fog translúcida e os ocultos com o styling atual.

### AC-4: Tile-based aposentado
- **Dado** a aba Mapas da campanha
- **Quando** renderiza
- **Então** o canvas de tiles não existe mais (launcher + MapEditor no lugar); o doc legado
  `map/current` é ignorado (sem migração — mapas de sessão são efêmeros, decisão ADR 0005).

### AC-5: Editor pessoal intocado
- **Dado** o MapEditor aberto pela tela "Mapas" (sem campanha)
- **Quando** usado
- **Então** comportamento idêntico ao atual (localStorage, múltiplas cenas, sem Firestore).

### AC-6: Tipografia legível no sistema Ordem
- **Dado** o tema `op` ativo
- **Quando** qualquer superfície OP renderiza (ficha, tabs, modais, drawer de rolagens)
- **Então** `--font-body` = Inter (era IM Fell English) e `--font-data` = IBM Plex Mono
  (era Share Tech Mono), via `SYSTEM_THEMES.op`; `--font-display` (nome do personagem,
  Cinzel Decorative) e `--font-title` (Cinzel) permanecem EXATAMENTE como estão.

## Casos de borda e erros
- Campanha sem `map/scene` ⇒ mestre começa com cena vazia padrão; jogador vê estado "aguardando".
- Falha de gravação (offline/permissão) ⇒ log com contexto (padrão F3); edição local não trava.
- Imagem que mesmo reduzida exceda ~900KB ⇒ segunda passada 1200px/0.7; se ainda exceder,
  alerta ao mestre e a imagem não sobe (cena continua íntegra).
- Snapshot com `hasPendingWrites` (eco local do mestre) ⇒ ignorado (não re-aplica).
- Dois mestres editando ⇒ last-write-wins (documentado; lock é backlog).

## Fora de escopo
> Vinculante.
- Endurecer rules para mestre-only (backlog consciente — ADR 0005 §4).
- Presença/cursores ao vivo, medição colaborativa, iniciativa no mapa.
- Migração de mapas tile-based ou dos mapas pessoais (localStorage) para a campanha.
- Vincular token do mapa à ficha/fase do personagem (proposta F4/F6 futura).
- Fontes dos outros sistemas (D&D mantém identidade própria).

## Rastreabilidade
- Missão SaaS F6; ADR 0005; regra Firestore da F2 (`match /map/{docId}`, spec 0004).
- Pedido de tipografia: Andre, 2026-07-04 (verbatim na conversa; nome do personagem intocado).
