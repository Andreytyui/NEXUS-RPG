---
name: spec-0019-mapa-correcoes
description: Contrato das correções de usabilidade do Editor de Mapas (camadas, seleção, ferramentas, persistência, iconografia). Modo pessoal (localStorage) e compartilhado.
alwaysApply: true
---

# Spec — Correções do Editor de Mapas

> **Fonte da verdade.** Status: em implementação (2026-07-09). Tier: Pequeno.
> Origem: Andre reportou "as funções não funcionam direito", prioridade em **camadas** e
> **ícones ilegíveis**. Objetivo: corrigir bugs (não features novas). Bugs confirmados por
> auditoria com arquivo:linha (ver `tasks.md`).

## Critérios de aceite

### AC-1: Mover o mapa dá feedback quando a camada está travada
- **Dado** o Editor com o mapa na camada "Mapa" (travada por padrão)
- **Quando** o usuário tenta arrastar/selecionar um elemento de uma camada travada
- **Então** aparece um aviso temporário ("Camada 'X' travada — destrave no painel") em vez de
  falhar em silêncio; destravando a camada, o elemento volta a mover normalmente.

### AC-2: Reordenar camadas pela UI
- **Dado** o painel de camadas
- **Quando** o usuário usa os controles de subir/descer de uma camada
- **Então** a ordem de empilhamento muda de verdade (o reducer `REORDER_LAYERS` é acionado) e
  os elementos daquela camada sobem/descem visualmente.

### AC-3: Empilhamento respeita camada E ordem interna (z)
- **Dado** elementos de tipos diferentes (imagem, token, desenho) na mesma ou em camadas distintas
- **Quando** renderizados, e quando se usa "trazer para frente"/"enviar para trás"
- **Então** o `zIndex` deriva da ordem da camada como fator dominante e do `z` do elemento como
  desempate — de modo que trazer/enviar tem efeito visível mesmo entre tipos diferentes.

### AC-4: Lock consistente
- **Dado** um elemento (token/nota/imagem/desenho) numa camada travada, e filhos anexados
- **Quando** o usuário clica ou arrasta
- **Então** ele não é selecionado nem movido por clique (consistente com o marquee, que já
  ignora travados); filhos travados não se movem junto de um pai destravado.

### AC-5: Imagens e desenhos são selecionáveis por clique
- **Dado** uma imagem ou desenho numa camada destravada
- **Quando** o usuário clica sobre ele
- **Então** ele é selecionado (hoje só o box-select funciona); numa camada travada, o clique
  atravessa para o canvas (permitindo box-select sobre o mapa).

### AC-6: A régua não gruda na tela
- **Dado** que o usuário mediu uma distância com a ferramenta régua
- **Quando** solta o mouse
- **Então** a linha/rotulo de medição some, e a toolbar de ação de seleção volta a aparecer ao
  selecionar elementos (hoje a régua residual a esconde).

### AC-7: Fog e opacidade não poluem o histórico
- **Dado** um arraste de forma de fog (retângulo/círculo) ou do slider de opacidade de camada
- **Quando** a interação termina
- **Então** gera **um único** passo de desfazer (não dezenas), e um só Ctrl+Z reverte a ação.

### AC-8: Zoom coerente
- **Dado** o mapa aberto
- **Então**: a roda do mouse dá zoom centrado no cursor e não faz scroll da página;
  os botões +/− dão zoom centrado na viewport; o botão "home" (⌂) enquadra o mapa no container.

### AC-9: Snap de token centralizado
- **Dado** o snap à grade ativo
- **Quando** um token é criado/movido
- **Então** ele cai **no centro da célula**, não na interseção das linhas.

### AC-10: Persistência não falha em silêncio
- **Dado** o modo pessoal (localStorage) e uma escrita que estoura a quota
- **Quando** o save falha
- **Então** o erro é logado e o usuário é avisado ("Armazenamento cheio — o mapa pode não ser
  salvo"), em vez de perder trabalho sem sinal (política da spec quick/001).

### AC-11: Imagens de fundo não estouram a quota à toa
- **Dado** um fundo de mapa carregado no modo pessoal
- **Então** é reduzido (cap ~2048px, JPEG) antes de persistir; imagens órfãs (de cenas/undo
  removidos) são coletadas para não vazarem quota.
- **Gate:** teste unitário de `collectOrphanImageIds(scenes, imageStore)`.

### AC-12: Iconografia legível
- **Dado** as toolbars e painéis do editor
- **Então** os controles usam ícones SVG legíveis (não emojis ambíguos); o mesmo glifo não
  representa três coisas diferentes (o antigo 👁 de revelar / visibilidade / preview vira três
  ícones distintos). Verificação visual documentada.

### AC-13: Layout do editor não corta e o painel recolhe
- **Dado** telas de altura moderada (~800px) e a toolbar direita com ~15 botões
- **Então** a toolbar nunca tem ícones cortados no topo/base (limita a altura e rola por dentro);
  o painel esquerdo (Cenas/Camadas) pode ser recolhido (botão « no header) para ganhar espaço de
  mapa e reaberto por uma alça » encostada à esquerda (e pelo botão de painel da toolbar).
- Verificação visual documentada.

## Fora de escopo (vinculante)
- Criar/deletar camadas (as 7 fixas são paridade Owlbear).
- Grid hexagonal (spec 0014), texto rico (0015).
- Modo campanha/Firestore: nenhuma mudança em `sync/` (as correções valem para ambos os modos
  por serem no render/interação compartilhados, mas não se altera o protocolo de sync).

## Rastreabilidade
- Auditoria de origem: 3 explorações (camadas/ferramentas/persistência), 2026-07-09.
- Specs relacionadas: 0008–0013 (editor Owlbear), quick/001 (catches silenciosos — estende ao MapEditor).
