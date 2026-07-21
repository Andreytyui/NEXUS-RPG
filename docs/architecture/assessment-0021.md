---
name: assessment-0021
description: Backlog priorizado do programa "Nexus impecável" — achados das 3 auditorias (regras OP, mapas, bug-hunt geral), 2026-07-09. Puxe ao continuar as correções.
alwaysApply: false
---

# Assessment 0021 — Backlog de qualidade (OP + Mapas + geral)

> Origem: 3 subagentes de auditoria (2026-07-09). Andre decidiu: **manter homebrew do Cellbit**
> (Esquiva 10+AGI+Reflexos e Proficiência +2..+6 FICAM — NÃO mexer) e **regras de OP primeiro**.
> Cada item: severidade + arquivo:linha + correção. Marque `[FEITO spec NNNN]` ao fechar.

## A. Ordem Paranormal — regras (PRIORIDADE 1)

- **[FEITO spec 0021]** Condições contaminadas por D&D reescritas fiéis ao livro (`App.jsx` `OP_CONDICOES`):
  Abalado (-2 perícia), Apavorado (-5 perícia+fugir), Atordoado (desprevenido+sem ações),
  Cego (desprevenido+lento+camuflagem total), removido "Exposto" (inexistente) → **Desprevenido**
  (-5 Defesa); adicionadas Agarrado, Alquebrado, Caído, Confuso, Indefeso, Petrificado, Sangrando.
  Fontes: Guia Rápido de Regras (Scribd/Studocu). Textos são de referência (app não auto-aplica).
- **[muda-jogo] Sobrecarga sem efeito nem teto** · `Tabs/InventarioTab.jsx:378-386`. Oficial:
  -5 Atletismo/Furtividade, -3m deslocamento; teto absoluto = 2× o limite. Hoje só mostra rótulo.
- **[incômodo · DECISÃO ANDRE = AVISO, não trava] Rituais sem gate de círculo por NEX** ·
  `Tabs/RituaisTab.jsx:12,107,249`. Andre: dar autonomia ao jogador/mestre, mas mostrar a limitação.
  → Implementar **aviso visual** (badge/tooltip) quando o círculo do ritual > o permitido pelo NEX
  (1º=5%,2º=25%,3º=55%,4º=85%), SEM impedir de adicionar. TODO.
- **[cosmético] `deriveStats().esquiva`/`.bloqueio` mortos** · `rules.js:113-114` (retornam AGI/0,
  não consumidos; a ficha recalcula em L385). Reconciliar ou remover.
- **[RESOLVIDO — sem ação] Perícia "Sobrevivência" destreinada?** · Andre confirmou: **NÃO** é usável
  destreinada. O código (`rules.js` `Sobrevivência*`) já está correto. Nenhuma mudança.
- **NÃO MEXER (decisão Andre = manter homebrew):** Esquiva passiva (`OrdemParanormalSheet.jsx:385`),
  Proficiência +2..+6 (`:386`). Ficam.

## B. Mapas (PRIORIDADE 2)

- **[bloqueia-uso] Editor é 100% mouse — zero toque** · `index.jsx` (onMouse*, sem onPointer/onTouch).
  Migrar container + `onElementDown` para Pointer Events + `setPointerCapture` + `touch-action:none`.
  Resolve de brinde o **arraste que solta ao encostar na toolbar** (`onMouseLeave={onUp}`, L1226).
  → MAIOR item de "usável de verdade" (tablet/celular na mesa).
- **[incômodo] `replaceImage()` sem downscale** · `index.jsx:497-508` (grava full-res, dribla o cap
  de 2048/JPEG da AC-11). Reusar pipeline do `loadBg`.
- **[incômodo] Clima não sincroniza/persiste** · `weather` é state local (`index.jsx:82`); mestre liga
  chuva e a mesa não vê. Mover p/ `scene.weather`.
- **[incômodo] Re-render global por frame** no arraste/resize/rotate · `setDragTick` (`index.jsx:894,901,926`).
- **[incômodo] Top-bar corta em tela estreita** · `index.jsx:1114-1137` (a AC-13 só tratou toolbar/painel).
- **[incômodo] `window.prompt/alert`** p/ nota/renomear/rótulo/salvar-asset (`index.jsx:859,619,653,534`) →
  modais in-app (ModalShell).
- **[incômodo] Estado vazio errado p/ viewer** · `index.jsx:1240-1249` ("Adicionar Imagem" a quem não pode).
- **[incômodo] Sem loading no modo campanha** até 1ª hidratação Firestore · `index.jsx:301-317`.
- **[polish] Emojis residuais**: context-menus (`index.jsx:1652-1726`), condições de token (`:39-43`),
  sub-toolbars Desenho/Fog (`:1497,1516`), permissão de camada 👤👥🚷 (`:1188`), chrome (⚔🗺✏✕) → `MapIcon`.
- **[polish] `aria-label`** nos botões só-ícone (MapIcon é aria-hidden).
- **[polish/latente] Fallback `DEFAULT_LAYERS` (4 camadas ids antigos)** diverge do schema V2 (7) ·
  `reducer.js:5-10` usado como fallback em `index.jsx`. Deveria ser `DEFAULT_LAYERS_V2`.

## C. Geral / transversal (PRIORIDADE 3)

- **[grave] Save de ficha engole erro do Firestore** · `hooks/useCharacter.js:10,18` (`catch(_){}`) —
  sync falha calada. Logar + flag de "falha ao salvar" p/ toast.
- **[incômodo] Carga de fichas: erro vira "nenhum personagem"** · `hooks/useCharacter.js:28,49-55`.
  Distinguir "sem dados" de "erro de carga".
- **[incômodo] Arquivar campanha 100% silencioso** · `App.jsx:2507` (`catch(e){}` vazio).
- **[incômodo] `charsLoading` buscado mas descartado** — Dashboard sem spinner · `App.jsx:11722`.
- **[incômodo] Uploads de capa engolem falha de resize** · `App.jsx:208,1498,2485,3878,4353`.
- **[incômodo] i18n EN incompleto** cai p/ PT misturado · `i18n/useLocale.js:21-30` (auditar en.js vs pt.js).
- **[DECISÃO ANDRE = É BUG, consertar] PIX desligado** · `createPixPayment`/`fsGetUserPlan` nunca
  chamados (`App.jsx:84,75`); a UI manda pro Catarse externo. Andre: era pra funcionar → **consertar
  o fluxo de pagamento PIX** (front chama `createPixPayment` → backend `/api/create-payment` já existe;
  ativar plano via webhook `/api/payment-webhook`). Tarefa maior — investigar o fluxo ponta a ponta
  (front `PlansScreen` + backend Vercel + `MERCADOPAGO_*` env vars). TODO prioritário.
- **[polish] Lint**: `no-dupe-keys` (`App.jsx:8927,9230`), array morto D&D (`DungeonsAndDragonsSheet.jsx:383-386`),
  vários `no-unused-vars` (features meio-implementadas: `setShowAddSkill`/`newSkillName` L8202/8231),
  `exhaustive-deps` em auto-save (`App.jsx:8284,8318` — verificar closure obsoleta).

## O que está CERTO (não retrabalhar)
Fórmulas PV/PE/SAN, peTurno=NEX/5, dtRituais, patentes, cargaMaxima=5+5×FOR, deslocamento 9m/6q,
defesa 10+AGI, atributos-base das 28 perícias, treino 5/10/15 na rolagem, rolagem de ataque/crítico
(0006+0020). Login/campanha/`/api/ai` têm loading+erro. Nav mobile existe (`MobileBottomNav`).
