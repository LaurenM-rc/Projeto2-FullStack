<div align="center">

# 💜 ✨ Controle Financeiro ✨ 💜

### 🌸 Suas finanças, de um jeito simples e delicado 🌸

*Controle entradas, saídas, cartões e faturas em um só lugar.*

<br>

![React](https://img.shields.io/badge/React-18-b79ced?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-8b5fd0?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-c4aaee?style=for-the-badge&logo=postgresql&logoColor=white)

</div>

---

Aplicação full stack para controlar entradas e saídas, categorias, contas, cartões de crédito e faturas, com dashboard e relatórios mensais.

## Funcionalidades

- Cadastro e login de usuários (senha com hash e autenticação por JWT)
- Lançamentos de entrada e saída, com parcelamento (até 48x) e divisão exata de centavos
- Categorias personalizadas
- Fontes e destinos: rendas, contas e cartões de crédito
- Cartões com limite, dia de fechamento e vencimento, e previsão das próximas faturas
- Dashboard com resumo do mês, despesas por categoria e últimos lançamentos
- Relatórios por categoria, por fonte/destino e de faturas

## Tecnologias

| Camada   | Tecnologias                                                        |
| -------- | ------------------------------------------------------------------ |
| Frontend | React 18, Vite, React Router                                       |
| Backend  | Node.js, Express 5, Sequelize, JWT, bcrypt, express-rate-limit     |
| Banco    | PostgreSQL (com SSL, por exemplo [Neon](https://neon.tech))        |

O visual usa a paleta lilás e branco com a fonte Poppins, definido em `frontend/src/index.css`.

## Estrutura

```
Projeto2-FullStack-main/
├── backend/
│   ├── database/        # schema.sql, setup.js e seed.js
│   └── src/
│       ├── config/      # conexão com o banco
│       ├── middlewares/ # autenticação, validação, erros
│       ├── models/
│       ├── routes/
│       └── server.js
└── frontend/
    ├── index.html
    └── src/
        ├── components/  # Layout, ProtectedRoute
        ├── contexts/    # AuthContext
        ├── pages/       # Login, Cadastro, Dashboard, Lançamentos...
        ├── services/    # api.js
        ├── utils/
        └── index.css    # todo o design
```

## Pré-requisitos

- Node.js 18 ou superior
- Um banco PostgreSQL com SSL e a sua string de conexão

## Como rodar

### 1. Backend

```bash
cd backend
npm install
```

Crie o arquivo `backend/.env` com:

```env
DATABASE_URL=postgres://usuario:senha@host/banco?sslmode=require
JWT_SECRET=uma_chave_longa_e_secreta
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Crie as tabelas e inicie a API:

```bash
npm run db:reset   # cria as tabelas (apaga as existentes)
npm run dev        # API em http://localhost:3000
```

Para já começar com dados de exemplo:

```bash
npm run db:seed
```

Isso recria as tabelas e cria dois usuários de teste:

| E-mail              | Senha       |
| ------------------- | ----------- |
| lauren@teste.com    | `Senha1234` |
| manuella@teste.com  | `Senha1234` |

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm run dev            # http://localhost:5173
```

O `.env` do frontend deve conter:

```env
VITE_API_URL=http://localhost:3000/api
```

> Deixe o backend rodando antes de abrir o frontend.

## Scripts

**Backend**

| Comando            | O que faz                                          |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Inicia a API com recarregamento automático         |
| `npm start`        | Inicia a API                                       |
| `npm run db:reset` | Apaga e recria as tabelas                          |
| `npm run db:seed`  | Recria as tabelas e insere dados de exemplo        |

**Frontend**

| Comando           | O que faz                          |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento        |
| `npm run build`   | Gera a versão de produção em `dist`|
| `npm run preview` | Visualiza a build de produção      |

## Rotas da API

Todas começam com `/api`. Exceto cadastro e login, exigem o token JWT no cabeçalho `Authorization: Bearer <token>`.

| Recurso            | Rotas                                                            |
| ------------------ | ---------------------------------------------------------------- |
| `/auth`            | `POST /cadastro`, `POST /login`, `GET /me`                       |
| `/categorias`      | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`                     |
| `/fontes-destinos` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`                     |
| `/lancamentos`     | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`         |
| `/relatorios`      | `GET /categorias`, `GET /fontes-destinos`, `GET /faturas`        |
| `/saude`           | `GET /` verifica se a API e o banco estão no ar                  |

## Observações

- O arquivo `.env` não vai para o Git (já está no `.gitignore`).
- A conexão com o banco exige SSL. Para usar um Postgres local sem SSL, ajuste `dialectOptions` em `backend/src/config/db.js`.
- 
