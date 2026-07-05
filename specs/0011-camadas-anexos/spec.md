---
name: spec-camadas-anexos
description: Contrato do auto-grudar (anexo→personagem, personagem→montaria), subárvores, z-order e menu de contexto ampliado. Fase 3 do plano Owlbear.
alwaysApply: true
---

# Spec — Mapa: camadas Owlbear, anexos e montarias

> **Fonte da verdade.** Status: aprovado (plano mestre Owlbear, 2026-07-04). Tier: Pequeno.
> Depende da 0009 (campos `parentId`/`z` já existem em todos os elementos).
> Design: [ADR 0006](../../docs/architecture/adr/0006-mapa-v2-elementos-em-docs.md).

## Resumo

Réplica do comportamento de camadas do Owlbear: elemento da camada Anexo solto sobre um
Personagem gruda nele (`parentId`); Personagem solto sobre uma Montaria gruda nela. Mover o
pai move a subárvore inteira; apagar o pai desanexa (não apaga) os filhos; duplicar duplica a
subárvore com vínculos remapeados. Z-order explícito (frente/trás) dentro da camada e ações
novas no menu de contexto (desanexar, z-order, substituir imagem).

## Critérios de aceite

### AC-1: Anexo gruda em personagem
- **Quando** um elemento da camada Anexo é solto com a âncora sobre um token de Personagem
- **Então** `parentId` aponta para o personagem e mover o personagem move o anexo junto

### AC-2: Personagem gruda em montaria (subárvore recursiva)
- **Quando** um Personagem é solto sobre um elemento da camada Montaria
- **Então** ele gruda; mover a montaria move personagem + anexos dele (recursivo)

### AC-3: Desanexar
- **Quando** o elemento anexado é arrastado para fora do pai (sem alvo válido no soltar) OU
  o mestre usa "Desanexar" no menu de contexto
- **Então** `parentId` volta a null e ele passa a mover-se sozinho

### AC-4: Apagar pai desanexa filhos
- **Quando** um elemento com filhos é apagado
- **Então** os filhos permanecem na cena com `parentId: null`

### AC-5: Duplicar com subárvore
- **Quando** um elemento com filhos é duplicado
- **Então** a cópia traz os filhos com novos ids e vínculos remapeados (offset +30)

### AC-6: Z-order
- **Quando** "Trazer para frente"/"Enviar para trás" no menu de contexto
- **Então** o campo `z` muda relativo aos elementos da MESMA camada e o render respeita

### AC-7: Substituir imagem
- **Quando** "Substituir imagem…" num elemento image
- **Então** o arquivo escolhido troca o `imageId` mantendo posição/tamanho/rotação

### AC-8: attach.js puro e testado
- Hit-test de alvo, guarda de ciclo, coleta de subárvore (cycle-safe) e dupSubtree têm testes

## Casos de borda

- Ciclo (A→B→A) impossível: `wouldCycle` bloqueia; subtreeIds tolera dados corrompidos
- Jogador movendo o próprio personagem montado: filhos movem no cliente de todos; o batch do
  jogador só escreve os elementos que `canMove` autoriza (anexos dele nascem com o ownerId dele)
- Alvo escondido/camada invisível → não é alvo de anexação

## Fora de escopo (vinculante)

- Fog nova (0012) · assets (0013) · grid hex (0014) · texto rico (0015) · auras/HP (0016)
- Anexação manual por menu (só desanexar; anexar é por drop)

## Rastreabilidade

- Design: ADR 0006 · Antecessoras: 0009, 0010 · Plano mestre Owlbear (0009–0016)
