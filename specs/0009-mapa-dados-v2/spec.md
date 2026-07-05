---
name: spec-mapa-dados-v2
description: Contrato da fundação de dados v2 do mapa (elementos em docs, multi-cena, fog shapes, 6 camadas, rules granulares). Base enquanto a feature está ativa.
alwaysApply: true
---

# Spec — Mapa: fundação de dados v2

> **Fonte da verdade.** Status: aprovado (plano mestre Owlbear, 2026-07-04). Tier: ARQUITETURAL.
> Design: [ADR 0006](../../docs/architecture/adr/0006-mapa-v2-elementos-em-docs.md).
> Fase 1 do plano de paridade Owlbear (0009–0016).

## Resumo

O mapa da campanha migra do doc único `map/scene` para o modelo v2 do ADR 0006: cenas múltiplas
(`map/{sceneId}` + ponteiro `map/state`), elementos em docs individuais com `ownerId/parentId/z`,
7 camadas Owlbear (Mapa, Desenho, Prop, Montaria, Personagem, Anexo, Nota), fog por shapes
(render SVG mask), grid como objeto configurável e rules granulares (dormentes p/ jogador até a
0010). Modo pessoal (localStorage) migra puro e continua com `elements[]` inline.

## Critérios de aceite

### AC-1: Migração Firestore sem perda e idempotente
- **Dado** uma campanha com o doc legado `map/scene` (elements, fogCells, gridSize) + `img_*`
- **Quando** o mestre abre a mesa tática após o deploy
- **Então** a cena vira `s_legacy` (state.activeSceneId = 's_legacy', elementos explodidos em
  docs, fogCells→shapes rect, camadas remapeadas, grid objeto), o legado vira tombstone, o
  jogador vê a mesma mesa sem perda, e reabrir a mesa não duplica nada

### AC-2: Migração localStorage (modo pessoal)
- **Dado** cenas v1 em `nexus_scenes_v1`
- **Quando** o editor pessoal abre
- **Então** `migrateScene` produz cenas `schemaV:2` (camadas remapeadas, notas na camada Nota,
  fog em shapes, grid objeto) e tudo continua editável e persistido

### AC-3: Multi-cena na campanha
- **Dado** o mestre na mesa tática v2
- **Quando** cria uma segunda cena e a ativa
- **Então** todos os clientes trocam para ela em <2s sem reload, e imagens usadas em mais de
  uma cena não são duplicadas (referência por imageId)

### AC-4: Escrita incremental
- **Dado** o mestre editando (mover/criar/apagar elementos)
- **Quando** o autosave publica
- **Então** apenas os docs dos elementos afetados são escritos (verificável pelo diff puro de
  `elementDiff`), e undo/redo publica o estado revertido

### AC-5: Rules granulares
- **Dado** as rules v2 deployadas
- **Então** (validação manual documentada no tasks.md): jogador não escreve cena/state/imagens;
  jogador só faz update de `x,y,rotation` em elemento com `ownerId` dele em camada com
  `update:'owner'`; jogador escreve apenas o próprio `live_{uid}`; mestre escreve tudo

### AC-6: Paridade visual
- **Dado** qualquer cena migrada
- **Quando** renderizada (mestre ou jogador)
- **Então** fog, tokens, desenhos, imagens e notas aparecem como antes (fog shapes rect
  equivalem às células; jogador segue read-only com fog opaca e hidden/spectre invisíveis)

## Casos de borda

- Migração com >400 elementos → batches em chunks (limite 500 ops)
- Cliente antigo aberto durante o rollout → vê tombstone/mesa vazia até recarregar (aceito)
- `state` sem cena correspondente (apagada) → cliente cai para a primeira cena `kind:'scene'`
- Falha de escrita → edição local continua; próximo debounce retenta (last-write-wins)

## Fora de escopo (vinculante — fases seguintes)

- UI de interação do jogador: mover token, ping, apontador, sync view, régua (0010)
- Auto-grudar anexos/montarias, context menu completo, z-order UI (0011)
- Ferramentas de fog círculo/polígono/livre, Fill/Cut UI nova, preview jogador (0012)
- Biblioteca de assets (0013) · grid hex/fórmulas/alinhamento (0014) · texto rico (0015)

## Rastreabilidade

- Design: ADR 0006 · Plano mestre: `~/.claude/plans/o-owlbear-foi-analisado-keen-steele.md`
- Antecessoras: specs 0007 (sync v1), 0008 (editor fase 1)
