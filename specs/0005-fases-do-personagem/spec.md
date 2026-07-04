---
name: spec-0005-fases-do-personagem
description: Contrato da feature (critérios de aceite). Base enquanto a feature está ativa.
alwaysApply: true
---

# Spec — Fases do personagem (retrato por estado)

> **Fonte da verdade.** Status: aprovado (Andre, 2026-07-03 — "sim" para F4 do plano da auditoria FASE 0)
> Frente D da missão SaaS. O jogador troca a imagem exibida do personagem conforme o estado
> (Normal, Cansado, Exausto, Morto + estados personalizados).

## Modelo de dados (retrocompatível)
- `form.phases: [{ id, label, image, imageAI? }]` — fases ADICIONAIS; a fase **"Normal" é virtual**
  e corresponde ao `form.avatar` existente (nenhuma migração de escrita em fichas legadas).
- `form.activePhaseId: string | null` — `null`/`"normal"`/ausente ⇒ exibe `form.avatar`.
- Helper puro único `getActiveAvatar(char)` em `src/domain/character.js` (aceita ficha completa
  ou `form`; ficha sem `phases` ⇒ comporta exatamente como hoje). Idem `isActiveAvatarAI(char)`.
- Persistência: dentro de `form`, pelo mesmo save debounced (~900ms) já existente — nada novo.
- Imagens de fase passam pelo MESMO pipeline `downscale` (420px, JPEG 0.82) do retrato.

## Critérios de aceite

### AC-1: Ficha legada continua idêntica
- **Dado** uma ficha sem `phases`/`activePhaseId`
- **Quando** é aberta/renderizada em qualquer tela
- **Então** exibe `form.avatar` como hoje, sem escrita de migração no Firestore.

### AC-2: Seletor de fases no retrato
- **Dado** a ficha OP aberta
- **Quando** o jogador clica no retrato
- **Então** o modal de retrato mostra a galeria de fases: "Normal" (avatar) + fases custom;
  clicar numa fase troca `form.activePhaseId` e o retrato exibido muda imediatamente.

### AC-3: CRUD de fases
- **Dado** o modal de retrato
- **Quando** o jogador adiciona ("Nova fase": rótulo + imagem via downscale), renomeia ou remove uma fase
- **Então** a mudança persiste via save debounced; remover a fase ativa volta para "Normal";
  sugestões rápidas de rótulo: Cansado, Exausto, Morto.

### AC-4: Fase ativa reflete em TODOS os pontos de exibição
- **Dado** `activePhaseId` apontando para uma fase com imagem
- **Quando** o retrato aparece na ficha, no DossierCard (dashboard), no MestrePanel (fichas ao vivo),
  no SharedSheetsPanel, na SheetList/cards do App e na ficha pública `/p/:id`
- **Então** todos exibem a imagem da fase ativa (via `getActiveAvatar`) — nenhum ponto lê `avatar` cru.

### AC-5: Aviso de IA acompanha a fase
- **Dado** uma fase com imagem gerada por IA (`imageAI: true`, herdando o fluxo da spec 0003)
- **Quando** ela é a fase ativa na ficha
- **Então** o aviso "Contém material gerado por inteligência artificial." aparece; fase com upload
  manual não exibe o aviso ("Gerar com IA" aplica na fase ativa e marca `imageAI`).

## Casos de borda e erros
- Fase ativa apontando para id inexistente ou fase sem imagem ⇒ fallback para `form.avatar`.
- Remover todas as fases ⇒ `phases: []`, `activePhaseId: null` — volta ao comportamento legado.
- Ficha de outros sistemas (dnd) ⇒ `getActiveAvatar` devolve `avatar` normalmente (sem UI de fases).
- MestrePanel detecta mudança comparando avatar ⇒ passar a comparar o avatar RESOLVIDO (fase ativa),
  para o mestre ver a troca de fase ao vivo.

## Fora de escopo
> Vinculante.
- Token no mapa refletir a fase (proposta para F6/B2 — o MapEditor atual nem exibe retratos).
- Fases em D&D/Tormenta (só OP nesta missão).
- Migração de dados (modelo é aditivo por design).

## Rastreabilidade
- FRENTE D do brief da missão; auditoria FASE 0 (9 pontos de render do avatar mapeados).
- Specs relacionadas: 0003 (aviso de IA), ADR-0004 (inline styles).
