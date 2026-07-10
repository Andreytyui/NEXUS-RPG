---
name: product
description: PRD-lite da feature (por quê e para quem). Puxe ao abrir feature arquitetural.
alwaysApply: false
---

# Product — Fallback de IA multi-provider

> **Tier:** arquitetural · **Status:** rascunho · **Dono:** Andre
> Responde: **por quê** e **para quem**. Mantenha em 1 página.

## Problema
Hoje o Ajudante do Mestre (`/api/ai`) depende de **um único provedor** (Groq, modelo
`llama-3.3-70b-versatile`). Se a Groq cair, tiver degradação, ou o `GROQ_KEY` estourar
rate limit/cota, o Ajudante do Mestre fica **totalmente indisponível** — sem alternativa,
sem aviso, o usuário só vê erro. Não há incidente registrado ainda; a motivação é
**preventiva**, disparada pela descoberta de que a NVIDIA liberou endpoints gratuitos
(`integrate.api.nvidia.com`) OpenAI-compatíveis que servem como segundo provedor real
(conta/infra diferente da Groq — reduz o ponto único de falha de verdade, não só de modelo).

## Para quem
Todo usuário autenticado que usa o **Ajudante do Mestre** (`MasterAssistant`, chat de IA
dentro de uma sessão de campanha) — é a única feature do Nexus que depende de IA de terceiro.

## Resultado esperado / métrica de sucesso
- Métrica: taxa de resposta bem-sucedida do `/api/ai` quando o provedor primário (Groq) está
  degradado ou fora do ar.
- Baseline hoje: **0%** (sem fallback, uma falha da Groq = falha total).
- Alvo: o proxy tenta até 3 provedores/modelos em cascata antes de reportar erro ao usuário;
  cada falha de disponibilidade (429/5xx/timeout) do provedor atual cai para o próximo.

## Goals
- Continuidade do Ajudante do Mestre quando o provedor primário falha.
- Cross-provider de verdade (Groq + NVIDIA) — não apenas trocar de modelo na mesma conta,
  que cairia junto num rate-limit ou outage daquela conta.
- Nenhuma mudança visível para o usuário no caminho feliz (mesmo contrato de resposta).

## Non-goals
- Balanceamento de carga / escolha de modelo por qualidade de resposta (isto é fallback de
  **disponibilidade**, não roteamento inteligente).
- Aplicar fallback ao caminho de dev local direto (`callGemini` sem `API_BASE`, que chama a
  Groq direto do browser com `REACT_APP_GROQ_KEY`) — expandir esse caminho exigiria expor uma
  2ª chave no cliente, o que não é uma troca aceitável só por conveniência de dev.
- Métricas/observabilidade formais (dashboards) — fica para quando o Nexus tiver analytics.
- Migrar o modelo de negócio de custo (o endpoint NVIDIA é free-tier, sujeito a mudança/rate
  limit próprios da NVIDIA — não é uma garantia contratual).

## Riscos / premissas
- **Premissa a confirmar com Andre:** plano da Vercel (Hobby vs Pro) — define o timeout máximo
  da function e, portanto, quantos hops de fallback cabem antes do Vercel matar a request.
  Ver Questão em aberto no `design.md`.
- **Premissa:** o free-tier da NVIDIA é adequado para uso ocasional (fallback), não para
  tráfego primário sustentado — se o Groq cair por muito tempo, o rate limit da NVIDIA
  free-tier pode ser atingido também.
