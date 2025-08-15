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

O parser tenta automaticamente os caminhos `pdfjs-dist/legacy/build/pdf.js`,
`pdfjs-dist/build/pdf.js`, `pdfjs-dist/legacy/build/pdf.mjs` e
`pdfjs-dist/build/pdf.mjs`, suportando tanto os builds em CommonJS quanto os
mais novos em ES Modules.

Se essa biblioteca não estiver instalada, o endpoint `/api/import-pdf`
retornará **"PDF import not available: Install optional dependency pdfjs-dist to enable PDF parsing"**.

Ao importar, é possível informar expressões regulares para localizar
enunciados, opções e respostas diretamente no texto extraído. Use grupos
capturados para identificar rótulos e conteúdos. Exemplo:

```
Padrão do enunciado: ^NEW QUESTION\s+\d+
Padrão das opções:   ^(A|B|C|D)[\).]\s+(.*)
Padrão da resposta:  ^Answer:\s*([A-D])
```

Se os padrões forem omitidos, o parser tenta detectar a estrutura pelas
posições e espaçamentos do PDF.

### Gerar expressões automaticamente

Para auxiliar na criação dessas expressões, o script `regexPatternGenerator.js`
analisa uma questão de exemplo e sugere padrões para enunciado, opções e
resposta:

```bash
node regexPatternGenerator.js
```

O script imprime um objeto com três strings (`regexEnunciado`, `regexOpcoes` e
`regexResposta`) que podem ser usadas posteriormente para importar questões.

Na tela **Importar Provas** do aplicativo, também é possível colar uma questão
de exemplo e clicar em **Gerar padrões** para preencher automaticamente os
campos de regex do formulário.

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
