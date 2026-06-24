# ADR-0002: Firebase como backend completo

- **Status:** aceito
- **Data:** 2026-06-22 (retroativo — decisão tomada na origem do projeto)
- **Decisores:** Andre (Andrey Lucas de Andrade Nonardo)

## Contexto
O projeto precisava de autenticação, banco de dados em tempo real e hospedagem para uma SPA
React. Velocidade de desenvolvimento era a prioridade, sem equipe de backend dedicada.

## Decisão
Vamos usar Firebase (Auth + Firestore + Hosting) como backend completo. Firebase Auth cobre
login por email/senha e Google OAuth. Firestore é o banco principal (NoSQL, real-time).
Firebase Hosting faz o deploy da SPA.

Alternativas descartadas: Supabase (menos familiaridade na época), backend próprio Node.js
(custo de manutenção alto para projeto solo).

## Consequências
- **+** Zero infraestrutura para gerenciar; deploy em minutos
- **+** Firestore com listeners em tempo real (chat, fichas ao vivo)
- **+** Free tier generoso para MVP
- **−** SDK acoplado diretamente nos componentes (sem abstração/repositório)
- **−** Firestore não tem transações complexas; esquema implícito (sem validação de tipos)
- **−** Difícil de mockar para testes sem abstrações adicionais
- **−** Vendor lock-in: migrar para outro banco seria custoso
