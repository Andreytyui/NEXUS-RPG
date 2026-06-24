---
name: glossary
description: Linguagem ubíqua. Puxe ao nomear, modelar domínio ou escrever specs.
alwaysApply: false
---

# Glossário — Linguagem Ubíqua

> A fonte única do vocabulário do sistema. O mesmo termo aparece aqui, na spec e no código.
> Termo novo introduzido por uma feature → adicione no mesmo PR. Sem sinônimos.

| Termo              | Definição                                                                              | NÃO confundir com         | Contexto          |
|--------------------|----------------------------------------------------------------------------------------|---------------------------|-------------------|
| **Agente**         | IA com personalidade e regras específicas da campanha (futuro: NPCs com memória)      | Jogador                   | IA                |
| **Campanha**       | Espaço compartilhado de jogo criado pelo Mestre, com código de convite e chat          | Mesa física               | Campanha          |
| **DossierCard**    | Card visual resumido do personagem exibido no dashboard e na visão do Mestre           | Ficha completa            | Ficha             |
| **Elemento**       | Afinidade paranormal do personagem em Ordem Paranormal (Sangue, Morte, Energia…)      | Atributo                  | Ficha / OP        |
| **Esquiva**        | Valor derivado de Defesa + bônus de Reflexos (cálculo em `rules.js`)                  | Defesa, Armadura          | Ficha / OP        |
| **Ficha**          | Conjunto completo de dados de um personagem (atributos, perícias, inventário, etc.)   | DossierCard               | Ficha             |
| **fs\***           | Prefixo das funções de Firestore em `App.jsx` (ex: `fsSaveCharacter`)                 | —                         | Infra             |
| **Jogador**        | Usuário participante de uma campanha (não é o Mestre)                                 | Mestre, Personagem        | Campanha          |
| **Mestre**         | Usuário criador da campanha; tem acesso à visão de todas as fichas dos jogadores       | Jogador                   | Campanha          |
| **NEX**            | Nível de Exposição ao Outro — determina progressão de atributos em Ordem Paranormal    | Nível (D&D)               | Ficha / OP        |
| **OP**             | Abreviação de Ordem Paranormal (sistema de RPG)                                        | —                         | Ficha             |
| **Personagem**     | Entidade de jogo criada e controlada por um Jogador                                   | Jogador (usuário real)    | Ficha             |
| **Plano**          | Nível de assinatura do usuário: `free` ou `ordem` (pago via PIX)                      | Campanha                  | Monetização       |
| **PublicSheet**    | Versão publicada de uma ficha, acessível via URL sem login                             | Ficha privada             | Ficha             |
| **Sistema**        | Conjunto de regras de RPG suportado (ex: Ordem Paranormal, genérico)                  | Campanha                  | Ficha             |
| **VitalSign**      | Componente que exibe HP, Sanidade e Esforço com barras visuais                        | Atributo                  | Ficha / UI        |

<!-- Mantenha em ordem alfabética. Cada linha deve ter um dono mental claro. -->
