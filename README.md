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
- Importação de questões a partir de arquivos **PDF**.
- Substituição em massa de termos nos enunciados com pré-visualização.

---

## 📦 Estrutura do projeto

```
├── public/                 # Frontend (HTML, CSS, JS)
│   ├── partials/            # Cabeçalho, rodapé e componentes
│   ├── styles.css           # Estilos (light/dark)
│   ├── common.js            # Funções globais e navbar
│   ├── index.html           # Tela inicial com tutorial
│   ├── admin.html           # Administração / lista de provas
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

---

## 📥 Importação de perguntas via PDF

É possível importar questões diretamente de um arquivo PDF que siga o formato:

```
NEW QUESTION 1
Pergunta...
A) Opção 1
B) Opção 2
Answer: A
```

Endpoint:

```
POST /api/import/pdf
```

Form-data:

- `file`: arquivo PDF com as perguntas.
- `examId` (opcional): ID de uma prova existente para anexar as questões.
- `title` e `description` (opcionais): usados ao criar uma nova prova se `examId` não for informado.
- `template` (opcional): modelo de parser a ser utilizado (`default` ou `flex`).

O retorno contém a quantidade de questões importadas e o `examId` utilizado.

Também existe uma interface web em `/import.html`, acessível pelo menu **Importar**, para realizar a importação via PDF ou JSON pelo navegador.

## 🔄 Substituição de termos nos enunciados

Permite buscar um termo em todos os enunciados e substituí-lo em massa. É possível visualizar previamente quais questões serão afetadas e, após confirmação, aplicar as alterações.

Endpoint:

```
POST /api/questions/replace
```

Body JSON:

- `examId` (opcional): limita a substituição a uma prova.
- `find`: termo a ser buscado (obrigatório). Caracteres especiais (como parênteses) são tratados literalmente.
- `replace`: texto de substituição.
- `confirm` (opcional): defina como `true` para aplicar; se omitido, retorna apenas o preview.

A página `questions.html` possui uma seção **Substituir termos** para facilitar o uso.

---

## 🤖 Integração com ChatGPT

Quando a chave da API do OpenAI está configurada e a conexão com o serviço está funcionando, a aplicação exibe ações adicionais nas telas de questões. A chave pode ser definida pela variável de ambiente `OPENAI_API_KEY` ou pela tela **Configurações** (`settings.html`).

- Botão **Gerar via GPT** para criar perguntas a partir de um prompt, disponível em `questions.html`. As questões geradas mesclam conteúdo teórico e de programação e garantem alternativas descritivas (campo `text`), usando o campo `code` apenas quando houver trechos de código.
- Opções **Verificar GPT** e **Explicar GPT** no menu de cada questão. A verificação abre um popup com o resultado e a explicação pode ser revisada antes de ser salva.
- Cada questão passa a exibir o status de verificação pelo ChatGPT (✅ correta, ❌ inválida, ❓ incerta) e permite seleção para verificação em massa.

O backend expõe as rotas:

- `GET /api/gpt/enabled` – indica se o serviço está configurado e acessível.
- `GET /api/gpt/key` – informa se uma chave de API está configurada.
- `POST /api/gpt/key` – atualiza a chave de API usada pelo serviço.
- `POST /api/gpt/generate` – gera novas questões para uma prova a partir de um `prompt` informado.
- `POST /api/gpt/verify` – verifica se as respostas cadastradas estão corretas segundo o ChatGPT.
- `POST /api/gpt/verify/bulk` – realiza a verificação de várias questões ao mesmo tempo e armazena o retorno do GPT.
- `POST /api/gpt/explain` – gera uma sugestão de explicação para a questão.
- `PUT /api/questions/:id/explanation` – atualiza o campo de explicação de uma questão.

As funcionalidades são exibidas apenas quando o serviço retorna habilitado.

A chave fornecida pela tela de configuração é persistida em `config.json` na raiz do projeto.

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
