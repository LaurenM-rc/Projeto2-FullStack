
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Carrega as variáveis do arquivo .env
dotenv.config();

// Inicializa o Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rota inicial
app.get("/", (req, res) => {
  res.json({
    message: "API do Controle Financeiro funcionando!"
  });
});

// Rota de verificação
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Servidor funcionando corretamente"
  });
});

// Porta do servidor
const PORT = process.env.PORT || 3000;

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
