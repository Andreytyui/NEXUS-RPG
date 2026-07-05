---
name: spec-fog-shapes
description: Contrato da fog avançada (círculo/polígono/traço livre, poda por contenção, modo edição, preview visão do jogador). Fase 4 do plano Owlbear.
alwaysApply: true
---

# Spec — Mapa: fog avançada

> **Fonte da verdade.** Status: aprovado (plano mestre Owlbear atualizado, 2026-07-05 —
> refinamento Join/Trim→poda+edição ratificado na aprovação do plano). Tier: Pequeno.
> Depende da 0009 (fog v2 = shapes + SVG mask sequencial, ADR 0006 §7).

## Resumo

As ferramentas Cobrir (F) e Cortar (R) ganham três formas além do retângulo célula-alinhado:
círculo (arrasto centro→raio), polígono (clique-a-clique) e traço livre (Douglas-Peucker).
"Camada única" vira **poda por contenção** automática (add totalmente contido é descartado —
Join/Trim manuais foram substituídos porque a mask binária torna união um no-op visual).
Sub-modo **edição** permite selecionar e apagar formas de fog individualmente. O mestre ganha
**preview "visão do jogador"** pixel-igual ao viewer. Render extraído para `FogLayer.jsx`.

## Critérios de aceite

### AC-1: Círculo
- **Quando** o mestre arrasta com a forma círculo em Cobrir/Cortar
- **Então** um círculo (centro no início do arrasto, raio até o cursor) cobre/revela a área,
  com preview ao vivo, e o jogador vê o resultado em tempo real

### AC-2: Polígono
- **Quando** o mestre clica ponto a ponto e fecha (clique no 1º ponto, duplo-clique ou Enter)
- **Então** o polígono cobre/revela; **Esc cancela** o polígono pendente sem efeito

### AC-3: Traço livre
- **Quando** o mestre desenha um traço livre
- **Então** ele vira um polígono fechado simplificado (Douglas-Peucker, ε≈4px de mundo)

### AC-4: Cut através de adds sobrepostos
- **Dado** dois `add` sobrepostos, **quando** um `cut` cruza a sobreposição
- **Então** o buraco inteiro é revelado (mask sequencial — sem "fantasma" de dupla camada)

### AC-5: Preview visão do jogador
- **Quando** o mestre ativa o toggle 👁
- **Então** o render fica pixel-igual ao do jogador (fog 0.98 opaca; hidden/spectre ocultos),
  com as ferramentas ainda funcionais; desligar volta ao render de mestre

### AC-6: Poda por contenção
- **Quando** uma forma `add` fica totalmente contida em outra `add` sem `cut` entre elas na
  ordem, **então** a contida é removida no commit (array não cresce sem fim). Poly como
  contêiner nunca poda (conservador)

### AC-7: Modo edição
- **Quando** o sub-modo 🧽 está ativo e o mestre clica numa forma de fog
- **Então** ela é selecionada (destaque) e pode ser apagada (botão ou Delete), refletindo
  para o jogador

### AC-8: fog.js puro e testado
- `simplify`, `strokeToPoly`, `shapeBBox`, `containsShape`, `pruneContained`, `pointInShape`,
  `hitFogShape` com testes unitários (incl. polígono côncavo e cut intercalado)

### AC-9: Regressão zero
- Cenas existentes (shapes rect da migração 0009) renderizam idênticas; retângulo continua
  o modo default

## Casos de borda

- Polígono com <3 pontos ao fechar → descartado sem efeito
- Polígono auto-intersectante → aceito (fill-rule padrão do SVG resolve)
- Traço livre minúsculo (<3 pontos após simplificação) → descartado
- Clique do modo edição fora de qualquer forma → limpa a seleção

## Fora de escopo (vinculante)

- Join/Trim geométricos manuais (substituídos — ver Resumo) · fog por célula hex (0014)
- Assets (0013) · texto rico (0015) · auras/HP (0016)

## Rastreabilidade

- Design: ADR 0006 §7 · Antecessoras: 0009–0011 · Plano mestre Owlbear (seção 0012)
