---
name: conformidade-licenca-op
description: Checklist de conformidade com a Licença da Comunidade de Ordem Paranormal — status por obrigação e onde está no código. Puxe ao mexer em branding, conteúdo OP, IA ou monetização.
alwaysApply: false
---

# Conformidade — Licença da Comunidade de Ordem Paranormal

> Fonte: https://ordemparanormal.com.br/licenca (lida em 2026-07-02).
> Implementação: spec `specs/0003-conformidade-licenca-op/`. Selo: `public/selo-conteudo-nao-oficial.png`.

| # | Obrigação da licença | Status | Onde no código |
|---|----------------------|--------|----------------|
| 1 | Selo "Conteúdo Não Oficial" na capa/equivalente, largura ≥10%, opacidade 100%, com contraste | ✅ Atendida | Ficha OP: `OrdemParanormalSheet.jsx` (bloco "Aviso obrigatório" abaixo do retrato, `<LicencaOP variant="ficha"/>` — width 10%, minWidth 48px); rodapé global: `App.jsx` `.nexus-footer` quando sistema OP ativo |
| 2 | Texto obrigatório exato: "Este é um conteúdo não oficial, publicado sob a Licença da Comunidade de Ordem Paranormal." | ✅ Atendida | `src/components/LicencaOP.jsx` (`TEXTO_NAO_OFICIAL`, fixo em pt-BR independente do locale) |
| 3 | Não sugerir parceria/aprovação/supervisão/endosso | ✅ Atendida | Rótulo "✦ Conteúdo oficial de Ordem Paranormal" removido → "✦ Conteúdo do livro base — material não oficial" (`Tabs/shared/modalStyles.js`, `Tabs/InventarioTab.jsx`, `Tabs/HabilidadesTab.jsx` ×2). Gate: grep "Conteúdo oficial de Ordem Paranormal" = 0 em `src/` |
| 4 | Não usar a marca/logos oficiais nem imitar identidade visual | ✅ Atendida | Branding do produto é "Nexus RPG" (`public/index.html`); tema visual próprio (dark gothic + CSS vars). Monitorar em novas telas |
| 5 | Aviso "Contém material gerado por inteligência artificial." junto a material de IA | ✅ Atendida | `LicencaOP.jsx`→`TEXTO_IA` exibido: na ficha junto ao retrato quando `form.avatarAI === true`; no modal "Retrato do Agente" (preview de imagem IA); no modal "✦ Gerar Retrato com IA"; no cabeçalho do `MasterAssistant` (App.jsx, conteúdo textual de IA). Flag `avatarAI` setado em `onGenerateAI` (true) / `onPortrait` e "Remover" (false); fichas antigas sem o flag não exibem o aviso (não presumir procedência) |
| 6 | Conteúdo COMERCIAL não pode conter material gerado por IA | ⚠️ Pendência jurídica | Postura aprovada (2026-07-02): geração de IA tratada como recurso gratuito, não vinculado a plano pago; **validar com advogado antes de vender qualquer conteúdo OP com IA**. Revisar quando o plano "Ordem" (PIX, `api/create-payment.js`) for reativado — ver fase F2 |
| 7 | Termos permitidos (5 atributos, PV/PE/SAN, NEX, Membrana, Outro Lado, 5 Elementos, nomes de perícias/rituais/poderes) | ✅ Atendida | `rules.js`, `elementos.jsx`, dados em `src/data/ordemParanormal/` usam apenas termos da lista permitida |
| 8 | Não usar nomes próprios do cânone (Agatha, Kian…), organizações (exceto Ordo Realitas), eventos/lugares canônicos | 🔍 A revisar | Nenhum encontrado na auditoria de UI. Pendente: revisão dos textos de `rituais-oficiais.json` / `itens-oficiais.json` (garantir paráfrase, não texto copiado do livro) |
| 9 | LGPD: não vender/ceder/compartilhar dados pessoais | ✅ Atendida (endurecer na F2) | Nenhum compartilhamento com terceiros no código. F2 corrige: leitura ampla de `campaigns` e escrita aberta em `publicSheets` (`firestore.rules`) |
| 10 | Conteúdo proibido (discriminatório, apostas, sexualização de menores) | ✅ N/A | Produto não gera/hospeda tal conteúdo; moderação de UGC é responsabilidade contínua |

## Pendências rastreadas
- [ ] Jurídico: IA × conteúdo comercial (item 6) — antes de reativar/vender o plano pago com features de IA no módulo OP.
- [ ] Revisar descrições de `src/data/ordemParanormal/*.json` (item 8) — paráfrase vs cópia.
- [ ] Otimizar `selo-conteudo-nao-oficial.png` (232 KB) — comprimir sem perder legibilidade (técnico, não bloqueante).
