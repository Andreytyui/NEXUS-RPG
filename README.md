# Nexus RPG System

Sistema de fichas para Ordem Paranormal com Mestre IA.

---

## 🚀 Rodar Localmente

### Pré-requisito
Instale o **Node.js** em: https://nodejs.org (versão LTS)

### Passos

```bash
# 1. Abra o terminal nesta pasta (nexus-rpg)
# No Windows: clique direito na pasta → "Abrir no Terminal"

# 2. Instale as dependências (só na primeira vez)
npm install

# 3. Rode o projeto
npm start
```

Abre automaticamente em **http://localhost:3000**

---

## 🌐 Publicar na Vercel (gratuito)

### Opção A — Arraste e solte (mais fácil)
1. Rode `npm run build` no terminal
2. Acesse https://vercel.com e crie uma conta gratuita
3. Clique em **"Add New Project"** → **"Deploy from CLI"** ou arraste a pasta `build/` direto

### Opção B — Via GitHub (recomendado para atualizações automáticas)
1. Crie conta no https://github.com
2. Crie um repositório novo
3. No terminal, dentro desta pasta:
   ```bash
   git init
   git add .
   git commit -m "nexus inicial"
   git remote add origin https://github.com/SEU_USUARIO/nexus-rpg.git
   git push -u origin main
   ```
4. Acesse https://vercel.com → **"Import Git Repository"** → selecione o repo
5. Clique **Deploy** — pronto! Link público gerado em ~1 minuto

### Atualizar depois (quando receber novo App.jsx do Claude)
```bash
# Substitua o arquivo src/App.jsx pelo novo
# Depois no terminal:
git add .
git commit -m "atualização"
git push
# A Vercel atualiza automaticamente em ~30 segundos
```

---

## 📁 Estrutura do Projeto

```
nexus-rpg/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx      ← arquivo principal (edite aqui)
│   └── index.js
├── package.json
├── vercel.json
└── README.md
```
