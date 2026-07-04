---
name: spec-0008-editor-owlbear
description: Contrato da feature (critérios de aceite). Base enquanto a feature está ativa.
alwaysApply: true
---

# Spec — Editor de mapas nível Owlbear, fase 1 (missão SaaS)

> **Fonte da verdade.** Status: aprovado (Andre, 2026-07-04 — "transforme ele em um editor de
> mapas como o owlbear"). Tier Pequeno: estende o MapEditor da spec 0007 sem mudar arquitetura —
> tudo vive em `scene.elements` (sync e viewer da 0007 valem automaticamente).

## Critérios de aceite

### AC-1: Ferramenta de desenho
- **Dado** a ferramenta ✏ Desenhar (atalho D) com modos traço livre/linha/retângulo/círculo,
  cor (paleta existente) e espessura (fina/média/grossa)
- **Quando** o mestre desenha no mapa
- **Então** cria elemento `type:'drawing'` na camada Desenho (preview ao vivo durante o traço);
  selecionável por box-select, movível, duplicável, ocultável e deletável como os demais;
  jogadores veem (respeitando hidden/spectre/camada).

### AC-2: Tokens com imagem
- **Dado** o botão 🖼 na barra do token
- **Quando** o mestre envia uma imagem (reduzida a ~256px)
- **Então** os próximos tokens usam a imagem em recorte circular (com a cor como borda);
  em modo campanha a imagem sobe pelo pipeline `img_*` existente e o jogador a vê.

### AC-3: Tamanhos de token
- **Dado** presets P/M/G/E (½×, 1×, 2×, 3× da célula) na barra do token e na toolbar de seleção
- **Quando** aplicados
- **Então** o token é criado/redimensionado proporcional à célula da cena.

### AC-4: Condições no token
- **Dado** o menu de contexto de um token com a fileira de condições
  (☠️ 😵 🩸 🛡️ 💤 🔥 ☣️ 👁️ — toggle)
- **Quando** o mestre marca/desmarca
- **Então** badges aparecem sobre o token para todos (mestre e jogadores).

### AC-5: Névoa por área
- **Dado** as ferramentas Névoa/Revelar
- **Quando** o mestre arrasta
- **Então** aplica o RETÂNGULO de células entre o início e o cursor (preview ao vivo);
  clique único continua afetando 1 célula.

### AC-6: Atalhos de teclado
- V seleção · T token · D desenhar · F névoa · R revelar · N nota · M medir · G grade
  (ignorados ao digitar em input e no modo jogador). Ctrl+Z/Y/A/D e Del continuam.

## Casos de borda
- Desenho de 1 ponto (clique sem arrasto) ⇒ descartado.
- Token com `imageId` sem imagem no store (ainda baixando) ⇒ cai no círculo colorido.
- Viewer: desenhos sem pointer-events; atalhos de ferramenta desabilitados.
- `conditions`/`imageId` ausentes em tokens antigos ⇒ render idêntico ao atual.

## Fora de escopo (fase 2)
> Vinculante.
- Ping/apontador sincronizado, barra de HP, aura/visão de token, fog poligonal,
  redimensionar/rotacionar desenhos, biblioteca de assets.

## Rastreabilidade
- Pedido do Andre 2026-07-04; specs 0007 (sync/viewer) e ADR 0005 (modelo de dados).
