# 📚 Node Exams App

Aplicação simples para cadastro e gerenciamento de **provas**, **questões** e **aplicações de prova**, com suporte a **upload de imagens** nas questões.  
Frontend em HTML/CSS/JS puro (tema claro/escuro), backend em **Node.js + Express**, persistência em **MongoDB** (Docker).

---

## 🚀 Funcionalidades

- Criar, listar, editar e excluir **provas**.
- Adicionar questões com alternativas **de texto ou imagem**.
- Aplicar provas e registrar respostas.
- Upload de arquivos para questões.
- Tema **Light/Dark** com persistência no navegador.
- Menu de administração para fácil navegação.

---

## 📦 Estrutura do projeto

```
├── public/                 # Frontend (HTML, CSS, JS)
│   ├── partials/            # Cabeçalho, rodapé e componentes
│   ├── styles.css           # Estilos (light/dark)
│   ├── common.js            # Funções globais e navbar
│   ├── index.html           # Página inicial / lista de provas
│   ├── questions.html       # CRUD de questões
│   └── take.html            # Aplicar prova
├── uploads/                 # Arquivos enviados (imagens)
├── server.js                # Servidor Node.js + Express
├── routes/                  # Rotas de API
├── models/                  # Modelos Mongoose
├── docker-compose.yml       # Subir app + MongoDB
├── package.json
└── README.md
```

---

## 🛠️ Tecnologias

- **Node.js** (Express.js)
- **MongoDB** + **Mongoose**
- **Multer** (upload de arquivos)
- HTML5, CSS3, JavaScript puro
- **Docker** e **Docker Compose**

---

## 🔧 Instalação

### 1) Clonar o repositório
```bash
git clone https://github.com/seu-usuario/node-exams.git
cd node-exams
```

### 2) Instalar dependências
```bash
npm install
```

### 3) Subir com Docker Compose
```bash
docker compose up -d
```

> Isso vai criar dois containers: **app** e **mongo**.

---

## 💻 Uso

1. Abra o navegador e acesse:
```
http://localhost:3000
```
2. No menu **Administração**, cadastre suas provas.
3. Adicione questões e alternativas (texto ou imagem).
4. Aplique a prova para visualizar no modo de execução.

### Importar questões de PDF (opcional)

Para habilitar a importação automática de questões a partir de arquivos PDF,
instale a dependência opcional `pdfjs-dist`:

```bash
npm install pdfjs-dist
```

Se essa biblioteca não estiver instalada, o endpoint `/api/import-pdf`
retornará **"PDF import not available"**.

---

## 📝 Variáveis de ambiente

Crie um arquivo `.env` na raiz com:
```env
PORT=3000
MONGO_URL=mongodb://mongo:27017/examdb
```

---

## 📂 Uploads

- Arquivos enviados vão para `public/uploads/`.
- Certifique-se de adicionar esta pasta no `.gitignore`.

---

## 📜 Licença

Este projeto está sob licença MIT - sinta-se livre para usar e modificar.
