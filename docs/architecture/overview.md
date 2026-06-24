---
name: architecture-overview
description: Arquitetura do sistema nos 5 eixos + segurança e operacional. Puxe ao trabalhar em arquitetura, infra, qualidade, observabilidade ou segurança.
alwaysApply: false
---

# Arquitetura do sistema

> Visão **consolidada** do sistema pelos 5 eixos (+ segurança e operacional). Cada seção é um
> **resumo curto + link** para o detalhe (ADRs, context-map, diagrams, TESTING). Gerado/atualizado
> no `/kickoff`. **Mantenha enxuto** — o detalhe vive nos docs linkados, aqui é o mapa.

## 1. Tech stack
- **Linguagem:** JavaScript (ES2022+), sem TypeScript
- **Framework UI:** React 18.2 com Create React App (react-scripts 5)
- **Estilização:** Inline styles em JS — [ADR-0004](adr/0004-inline-styles.md)
- **Pacotes:** npm
- Decisão de stack: [ADR-0003](adr/0003-react-cra.md)

## 2. Arquitetura base
- **Estilo:** SPA monolítica — `App.jsx` como orquestrador central (~2500 linhas)
- **Code split:** Sheets de sistema via `React.lazy` (ex: `OrdemParanormalSheet`)
- **Bounded contexts:** implícitos (não separados ainda) — ver [context-map.md](context-map.md)
- **Próximo passo:** split de App.jsx em hooks por domínio (Auth, Campaign, Character)
- Diagramas: [diagrams.md](diagrams.md)

## 3. Infra
- **Cloud:** Firebase (Auth + Firestore + Hosting) — [ADR-0002](adr/0002-firebase-backend.md)
- **Deploy:** Firebase CLI (`firebase deploy`), predeploy `npm run build`
- **Ambientes:** produção único (sem staging separado)
- **Pagamentos:** API externa PIX via `API_BASE` → `/api/create-payment`

## 4. Qualidade
- **Testes:** nenhum ainda — alvo: React Testing Library, ≥80% em `rules.js`
- **CI/CD:** nenhum ainda — alvo: GitHub Actions com build + lint em cada PR
- **Lint:** ESLint padrão CRA
- Comandos e gates: [TESTING.md](../engineering/TESTING.md)

## 5. Observabilidade
- **Logs:** fail-silent em todos os helpers Firestore — sem logs estruturados
- **Métricas/alertas:** nenhum
- **Gap:** remover fail-silent; adicionar `console.error` com contexto no mínimo

## 6. Segurança
- **Auth:** Firebase Auth (email+senha, Google OAuth)
- **Regras Firestore:** `firestore.rules` presente — revisar a cada nova coleção
- **LGPD:** dados de usuário em Firestore sem política de retenção/deleção formal

## 7. Operacional
- **Deploy:** manual via `firebase deploy`
- **Rollback:** via Firebase Hosting console (versões anteriores disponíveis)
- **Backup:** Firestore sem backup automatizado configurado
- **Incidentes:** detectados por usuários (sem alertas proativos)
