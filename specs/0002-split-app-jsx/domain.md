---
name: domain-split-app-jsx
description: Bounded contexts e linguagem ubíqua do split. Puxe ao implementar os hooks.
alwaysApply: false
---

# Domain — Split de App.jsx

## Bounded Contexts

| Contexto | Responsabilidade | Hook |
|---|---|---|
| **Auth** | Identidade do usuário — quem está logado, credenciais | `useAuth` |
| **Character** | Fichas de personagem — criação, edição, persistência | `useCharacter` |
| **Campaign** | Campanhas multiplayer — criação, entrada, membros | `useCampaign` |

## Linguagem ubíqua

| Termo | Definição |
|---|---|
| `currentUser` | Objeto Firebase User autenticado (null se deslogado) |
| `character` / `ficha` | Personagem de RPG de um usuário |
| `campaign` / `campanha` | Sessão multiplayer com mestre e jogadores |
| `uid` | ID único do usuário no Firebase Auth |
| `masterId` | uid do mestre de uma campanha |
| `inviteCode` | Código de 6 chars para entrar em campanha |

## Dependências entre contextos

```
Auth ← Character (character.ownerId = uid)
Auth ← Campaign  (campaign.masterId = uid, campaign.members[])
```

**Regra:** hooks não se importam diretamente. App.jsx injeta `uid` e `userName` como parâmetros.
