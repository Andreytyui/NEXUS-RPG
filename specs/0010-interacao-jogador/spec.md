---
name: spec-interacao-jogador
description: Contrato da interação do jogador na mesa tática (mover token próprio, ping/apontador, sync view, permissões por camada). Fase 2 do plano Owlbear.
alwaysApply: true
---

# Spec — Mapa: interação do jogador

> **Fonte da verdade.** Status: aprovado (plano mestre Owlbear, 2026-07-04). Tier: Pequeno.
> Depende da spec 0009 (rules v2 e docs por elemento já deployados — caminho dormente).
> Design: [ADR 0006](../../docs/architecture/adr/0006-mapa-v2-elementos-em-docs.md) §5–6.

## Resumo

O jogador deixa de ser 100% read-only: ganha Selecionar (restrito ao que as permissões
autorizam), Régua e Apontador; move o PRÓPRIO token com sync ao vivo; pinga com duplo-clique.
O mestre reatribui dono de token, configura permissões por camada e transmite a câmera
(Sync View). Canal efêmero: doc `campaigns/{id}/map/live_{uid}` (ADR 0006 §5).

## Critérios de aceite

### AC-1: Mover o próprio token
- **Dado** um jogador membro e um token com `ownerId` dele numa camada com `update:'owner'`
- **Quando** ele arrasta o token
- **Então** o movimento aparece para todos (throttle ~300ms + posição final no soltar) e
  tokens de outros donos/camadas sem permissão **não iniciam drag** (cursor not-allowed)

### AC-2: Reatribuir dono (mestre)
- **Quando** o mestre usa "Atribuir a…" no menu de contexto do token e escolhe um membro
- **Então** `ownerId` muda e o jogador escolhido passa a poder mover o token

### AC-3: Permissões por camada (mestre)
- **Quando** o mestre alterna a permissão de update de uma camada (none → owner → all)
- **Então** a mudança persiste em `permissions` da cena e vale para o próximo drag do jogador

### AC-4: Ping
- **Quando** qualquer participante dá duplo-clique no mapa
- **Então** todos veem um pulso (~3s) na posição, na cor do usuário, em <1s

### AC-5: Apontador e régua compartilhados
- **Quando** um participante usa a ferramenta Apontar (ou mede com a régua)
- **Então** os demais veem o cursor/linha com nome e cor; o indicador some ao trocar de
  ferramenta ou após ~6s sem atualização (staleness)

### AC-6: Sync View
- **Quando** o mestre ativa a transmissão de câmera
- **Então** pan/zoom dos jogadores seguem o do mestre; pan/zoom manual do jogador interrompe
  o acompanhamento e o botão "Seguir mestre" retoma

### AC-7: Helpers de permissão testados
- `canMove/canCreate/canDelete` (puros) têm testes unitários cobrindo a matriz
  dono × camada × modo (none/owner/all) × mestre

## Casos de borda

- Jogador arrastando quando o mestre remove a permissão → próximo drag bloqueado (o em curso
  termina; a escrita pode ser negada pelas rules — estado converge no snapshot)
- Doc `live_*` órfão (aba fechada) → some pela regra de staleness; deleteDoc best-effort no unmount
- Relógio do cliente desviado → staleness usa janela generosa (6s); ping usa janela própria (3s)

## Fora de escopo (vinculante)

- Auto-grudar/anexos e context menu completo (0011) · fog nova (0012) · assets (0013) ·
  grid hex (0014) · barra de HP e auras (0016) · dados 3D · presença/cursores fora do mapa

## Rastreabilidade

- Design: ADR 0006 §5–6 · Antecessora: spec 0009 · Plano mestre Owlbear (0009–0016)
