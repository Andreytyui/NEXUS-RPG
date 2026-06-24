---
name: STATE
description: Memória de trabalho volátil — onde paramos, próximo passo, bloqueios.
alwaysApply: true
---

# STATE — Memória viva do projeto

> Memória de trabalho **entre sessões** (humanos e agentes). É **volátil**: atualizada o tempo
> todo. Diferente do **ADR** (decisão durável e imutável). Decisão estrutural → ADR; estado do
> trabalho → aqui. Atualize ao **pausar/encerrar**; leia ao **retomar**. Use a skill `/handoff`.

**Última atualização:** 2026-06-23 por Claude (setup-ci)

## Em andamento / próximo passo
- Feature ativa: sem spec ativa
- **Próximo passo:** configurar secrets do Firebase no GitHub → depois `/nova-feature` para `specs/0001-split-app-jsx/`

## Decisões recentes
- 2026-06-23: CI/CD criado em `.github/workflows/ci.yml` — build + testes + cobertura como artefato
- 2026-06-23: `TESTING.md` preenchido com comandos reais (CRA + npm test)
- 2026-06-22: North Star definida — plataforma social de RPG com IA no centro
- 2026-06-22: Firebase como backend — [ADR-0002](architecture/adr/0002-firebase-backend.md)
- 2026-06-22: React CRA como bundler — [ADR-0003](architecture/adr/0003-react-cra.md)
- 2026-06-22: Inline styles como estratégia — [ADR-0004](architecture/adr/0004-inline-styles.md)

## Bloqueios
- [ ] Secrets do Firebase no GitHub (Settings > Secrets > Actions) — sem isso o job `build` da CI falha:
      `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_PROJECT_ID`,
      `REACT_APP_FIREBASE_STORAGE_BUCKET`, `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`, `REACT_APP_FIREBASE_APP_ID`

## Ideias adiadas / backlog técnico
- Cobertura mínima (%) — definir após primeiros testes de `rules.js`
- Migração de CRA para Vite → após split de App.jsx e testes mínimos
- TypeScript → quando base de testes estiver sólida

## Todos soltos
- [ ] Configurar secrets do Firebase no GitHub (desbloqueador imediato da CI)
- [ ] Criar `specs/0001-split-app-jsx/spec.md` via `/nova-feature`
- [x] Configurar GitHub Actions (ci.yml — build + testes + cobertura)
- [ ] Adicionar testes para `rules.js` (cálculos OP)
- [ ] Definir cobertura mínima no CLAUDE.md após primeiros testes
