---
name: tasks
description: Decomposição e gates do fallback de IA multi-provider. Puxe ao implementar (após aprovação do design.md — já aprovado 2026-07-09).
alwaysApply: false
---

# Tasks — Fallback de IA multi-provider

> Cada task mapeia AC(s) e tem gate executável. `[P]` = paralelizável. Um commit por task.

## Plano

| #  | Task                                                              | Cobre AC | Depende de | Gate (comando)                                                          | Status |
|----|--------------------------------------------------------------------|----------|------------|----------------------------------------------------------------------------|--------|
| 1  | `src/server/aiFallback.js` — `PROVIDER_CHAIN`, `shouldFallback`, `buildRequestBody` + testes | AC-7 | — | `npm test -- --watchAll=false --testPathPattern=aiFallback` | **done** (13/13 verde) |
| 2  | `api/ai.js` — laço de cascata pela `PROVIDER_CHAIN` (substitui o `fetch` único) | AC-1,2,3,4,5,6 | 1 | `npm run build` (verde) + smoke test com fetch mockado | **done** |
| 3  | `.env.example` — documentar `NVIDIA_API_KEY`                     | —        | —          | inspeção visual (doc)                                                      | **done** |
| 4  | Checklist manual: forçar cada elo a falhar e confirmar cascata    | AC-2,3,4,5 | 2        | ver "Checklist manual" abaixo                                              | **parcial** — ver nota |
| 5  | Regressão: suíte completa + build verdes                          | AC-6     | 2,4        | `npm test -- --watchAll=false` + `npm run build`                          | **done** (16 suítes/118 testes) |
| 6  | Cleanup opcional: remover `model` do corpo de `callGemini` `[P]`  | —        | 2          | `npm run build` (verde)                                                    | opcional (não feito) |

> **Nota sobre a task 4:** os 5 cenários (AC-1 a AC-5) foram verificados fim a fim com um script
> ad-hoc que exercita `api/ai.js` de verdade com `fetch`/env mockados (não commitado — vive só no
> scratchpad da sessão), confirmando: sucesso direto, fallback Groq→NVIDIA, não-cascateio em 400
> (com asserção explícita de que a NVIDIA não foi chamada), 503 amigável quando ambos falham, e
> propagação do erro exato da Groq quando só ela está configurada. **O que ainda falta** é uma
> passada real contra Groq/NVIDIA de verdade (rede real, timeout real) — bloqueada até o Andre
> configurar `NVIDIA_API_KEY` na Vercel (ver seção abaixo) e fazer um teste em produção/preview.

> Task 6 é opcional/não-bloqueante (ver `design.md`, item 4 da Solução) — pode ficar para
> depois sem impedir o Definition of Done desta feature.

## Configuração manual do Andre (fora do código, mas bloqueia AC-2 em produção)
- [ ] Gerar uma chave NVIDIA nova em build.nvidia.com (a anterior foi rotacionada nesta sessão
      por ter sido colada em texto — ver `docs/STATE.md`).
- [ ] Adicionar `NVIDIA_API_KEY` nas env vars da Vercel (Settings → Environment Variables).
- [ ] Redeploy para a env var entrar em vigor.
> Sem isso, o comportamento cai automaticamente no caso AC-5 (elo pulado) — não quebra nada,
> só não ganha o fallback ainda.

## Plano de teste
- Unidade: `shouldFallback` (limites 429/500/503/400/200 — AC-7); `buildRequestBody` (aplica
  `extraParams` só no elo certo — AC-7).
- Integração: sem mock de rede automatizado nesta feature (mesma lacuna pré-existente do
  `api/ai.js` — ver `design.md` eixo Qualidade); coberta pelo checklist manual (task 4).
- Aceite: AC-1/6/7 têm gate executável; AC-2/3/4/5 via checklist manual documentado abaixo
  (não há harness de mock de fetch no projeto — mesmo padrão usado nos ACs visuais da 0017).

## Checklist manual (task 4 — AC-2/3/4/5)
- [ ] **AC-2 (Groq falha → NVIDIA responde):** simular indisponibilidade real da Groq (ex.:
      apontar temporariamente a URL do elo 1 para uma porta fechada localmente, gerando
      timeout/erro de rede — mais fiel a "disponibilidade" do que uma chave inválida, que
      gera 401 e cai no caso de AC-3) → NVIDIA deve responder e o campo `provider` deve ser
      `"nvidia-mistral"`.
- [ ] **AC-3 (400 não cascateia):** mandar uma requisição com `messages` malformado (ex.: não
      é array) → deve voltar 400 imediatamente, **sem** log de tentativa na NVIDIA.
- [ ] **AC-4 (ambos falham):** simular indisponibilidade dos dois (ex.: ambas as URLs erradas
      temporariamente) → deve voltar 503 com mensagem amigável, não o erro cru de nenhum provedor.
- [ ] **AC-5 (NVIDIA_API_KEY ausente):** remover a env var → Groq falhando não deve tentar
      chamar a NVIDIA (sem erro de "fetch failed" por URL/key ausente); erro reportado é o da Groq.

## Divergências (SPEC_DEVIATION)
- [ ] (registrar aqui se surgir)

## Checklist de Definition of Done
- [ ] AC-1/6/7 verdes pelo gate executável (`npm test`)
- [ ] AC-2/3/4/5 verdes pelo checklist manual documentado acima
- [ ] `npm run build` verde · suíte existente sem regressão
- [ ] Nenhum `SPEC_DEVIATION` pendente
- [ ] `NVIDIA_API_KEY` documentada em `.env.example`
- [ ] `docs/STATE.md` atualizado (próximo passo / decisões / pendência manual do Andre)
