<div align="center">

# Controle Financeiro

**Aplicação full stack para controlar entradas, saídas, cartões de crédito e faturas.**

![React](https://img.shields.io/badge/React-18-b79ced?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-8b5fd0?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-c4aaee?style=for-the-badge&logo=postgresql&logoColor=white)

</div>

---

## Sobre o projeto

O Controle Financeiro permite que cada pessoa registre seu dinheiro em um só lugar: o que entra, o que sai, em qual conta ou cartão e em qual categoria. A aplicação mostra um resumo do mês, gera relatórios e **prevê as faturas dos cartões de crédito**, inclusive de compras parceladas, indicando em qual fatura cai cada parcela.

O projeto foi desenvolvido para a disciplina de Desenvolvimento Web Full Stack (UTFPR). Ele reúne autenticação, modelagem de banco de dados, regras de negócio com dinheiro e uma interface em React.

**Equipe:** _Lauren Marçulo e Manuella Reginato_

## Funcionalidades

**Contas e acesso**
- Cadastro com validação no servidor (e-mail válido, CPF com dígitos verificadores, senha forte)
- Login com JWT; senhas guardadas com hash e salt
- Cada usuário enxerga apenas os próprios dados

**Lançamentos**
- Entradas e saídas, com categoria e fonte/destino
- Compras parceladas no cartão (de 1 a 48 parcelas), com divisão exata dos centavos
- Listagem com filtros, paginação e totais de entradas, saídas e saldo
- Edição e exclusão, com escolha entre apagar uma parcela ou toda a compra

**Cadastros**
- Categorias personalizadas, de entrada ou saída
- Fontes e destinos: rendas, contas e cartões de crédito (com limite, dia de fechamento e vencimento)
- Categorias e uma conta corrente padrão criadas automaticamente no cadastro

**Relatórios**
- Por categoria, com percentuais e comparação com o período anterior
- Por fonte/destino, com saldo das contas
- Previsão de faturas: a fatura atual e as próximas de cada cartão, com limite utilizado e disponível

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Front-end | React 18, Vite, React Router |
| Back-end | Node.js, Express 5, Sequelize (ORM) |
| Banco de dados | PostgreSQL hospedado no [Neon](https://neon.tech) |
| Segurança | JWT, bcrypt, express-rate-limit, CORS restrito |

O visual usa a fonte Poppins e uma paleta lilás, definidos em `frontend/src/index.css`.

## Arquitetura

```
Navegador (React)  ──HTTP/JSON──▶  API (Express)  ──Sequelize──▶  PostgreSQL (Neon)
  AuthContext + api.js              routes → middlewares → models
```

O back-end é organizado em camadas, cada uma com uma responsabilidade:

| Pasta | Função |
| --- | --- |
| `routes/` | Define as rotas e responde às requisições |
| `middlewares/` | Autenticação (JWT), validação das entradas, tratamento central de erros e limite de tentativas de login |
| `models/` | Único ponto de acesso ao banco, e também as regras de negócio (CPF, parcelas, faturas) |
| `config/` | Conexão com o banco e o pool de conexões |
| `database/` | `schema.sql` (tabelas e restrições), `setup.js` e `seed.js` |

No front-end, o `api.js` é o único cliente HTTP: ele anexa o token a cada requisição e, se a API responder 401 em uma rota protegida, o `AuthContext` encerra a sessão e leva o usuário ao login.

## Estrutura do repositório

```
Projeto2-FullStack/
├── backend/
│   ├── database/          # schema.sql, setup.js, seed.js
│   └── src/
│       ├── config/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       └── server.js
├── frontend/
│   ├── index.html
│   └── src/
│       ├── components/    # Layout, ProtectedRoute
│       ├── contexts/      # AuthContext
│       ├── pages/         # Login, Cadastro, Dashboard, Lançamentos, Relatórios...
│       ├── services/      # api.js (cliente HTTP único)
│       └── utils/
├── .env.example
└── README.md
```

## Modelo de dados

Quatro tabelas, criadas por `backend/database/schema.sql`:

| Tabela | Descrição |
| --- | --- |
| `usuarios` | `email` e `cpf` com `UNIQUE`; e-mail em minúsculas, CPF só com dígitos; senha apenas como hash |
| `categorias` | Pertencem a um usuário; tipo `entrada` ou `saida`; nome único por usuário e tipo |
| `fontes_destinos` | Tipo `renda`, `conta` ou `cartao_credito`; no cartão, fechamento, vencimento e limite são obrigatórios (`CHECK`) |
| `lancamentos` | Tipo, descrição, valor `NUMERIC(12,2)` maior que zero, data, categoria, fonte/destino e dados de parcelamento |

Os valores em dinheiro nunca usam ponto flutuante. As chaves estrangeiras impedem apagar categorias e fontes que tenham lançamentos.

## Decisões de projeto

- **Unicidade garantida pelo banco.** E-mail e CPF têm `UNIQUE`; o código não consulta antes de inserir. Assim, dois cadastros simultâneos com os mesmos dados não passam juntos (evita *race condition*). O erro do banco (`23505`) vira uma resposta 409 que indica o campo duplicado.
- **Isolamento entre usuários.** O `usuario_id` vem sempre do token, nunca do corpo ou da URL, e toda consulta filtra por ele. Acessar um registro alheio retorna 404, sem revelar que ele existe.
- **Parcelamento.** Cada parcela é uma linha, gravada em uma transação (ou todas, ou nenhuma). O valor é dividido em centavos e a sobra vai para a primeira parcela: R$ 100,00 em 3x vira 33,34 + 33,33 + 33,33.
- **Faturas calculadas, não armazenadas.** Todas as parcelas guardam a data da compra, e a fatura é calculada por `calcularFatura` a partir do fechamento do cartão. Compra antes do dia de fechamento entra na fatura do mês; no dia do fechamento ou depois, entra na do mês seguinte. O limite utilizado é a soma das parcelas que ainda não venceram.
- **Compra parcelada na edição.** Só descrição e categoria podem mudar (valendo para todas as parcelas). Para alterar valor, data ou cartão, exclui-se a compra e lança-se de novo.
- **Totais no banco.** Relatórios usam `GROUP BY` e `SUM` no PostgreSQL, e não no front-end.
- **Esquema em SQL.** As tabelas vêm do `schema.sql`, para manter `CHECK`, `UNIQUE` composto e `NUMERIC` no banco. Os models do Sequelize apenas mapeiam essas tabelas.
- **Regras puras testáveis.** `cpfValido`, `dividirEmParcelas`, `periodoAnterior` e `calcularFatura` são funções puras em `models/`, sem acesso ao banco.

## Segurança

- Senhas com `bcrypt` (hash + salt); nunca aparecem nas respostas da API
- Login com mensagem genérica (`E-mail ou senha inválidos.`), sem revelar se o e-mail existe
- Token JWT com expiração de 1 hora
- Limite de 10 tentativas de login falhas a cada 15 minutos (`express-rate-limit`)
- Consultas parametrizadas, contra SQL injection
- CORS restrito à origem do front-end (`FRONTEND_URL`)
- Validação de todas as entradas no servidor
- Segredos em variáveis de ambiente; o `.env` não é versionado

## Como rodar localmente

### Pré-requisitos

- Node.js 18 ou superior
- Um banco PostgreSQL com SSL (por exemplo, uma conta gratuita no [Neon](https://neon.tech))

### 1. Back-end

```bash
cd backend
npm install
```

Crie `backend/.env` a partir do modelo `.env.example` (na raiz do repositório):

```env
PORT=3000
DATABASE_URL=postgresql://usuario:senha@host/neondb?sslmode=require
JWT_SECRET=um-texto-longo-e-aleatorio
FRONTEND_URL=http://localhost:5173
```

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta da API (padrão 3000) |
| `DATABASE_URL` | Connection string do PostgreSQL |
| `JWT_SECRET` | Texto longo e aleatório usado para assinar os tokens |
| `FRONTEND_URL` | Origem permitida pelo CORS, sem barra no final |

Crie as tabelas, carregue os dados de demonstração e suba a API:

```bash
npm run db:seed    # recria as tabelas e insere os dados de exemplo
npm run dev        # API em http://localhost:3000
```

> `db:seed` e `db:reset` **apagam todos os dados** do banco configurado.

Para conferir: abra `http://localhost:3000/api/saude`.

### 2. Front-end

```bash
cd frontend
npm install
cp .env.example .env    # no Windows: copy .env.example .env
npm run dev             # http://localhost:5173
```

O `frontend/.env` deve conter `VITE_API_URL=http://localhost:3000/api`. Deixe
