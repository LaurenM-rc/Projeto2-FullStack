import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize } from './config/db.js';
import './models/index.js';
import { naoEncontrado, tratarErros } from './middlewares/erros.js';
import authRoutes from './routes/auth.routes.js';
import categoriasRoutes from './routes/categorias.js';
import fontesDestinosRoutes from './routes/fontes-destino.js';
import lancamentosRoutes from './routes/lancamentos.js';
import relatoriosRoutes from './routes/relatorios.js';

const app = express();

// Atrás do proxy do Vercel: necessário para o rate limit enxergar o IP real
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/fontes-destinos', fontesDestinosRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/relatorios', relatoriosRoutes);

app.get('/api/saude', async (req, res) => {
  const [rows] = await sequelize.query('SELECT NOW() AS agora');
  res.json({ status: 'ok', banco: rows[0].agora });
});

app.use(naoEncontrado);
app.use(tratarErros);

// Local: sobe o servidor. No Vercel (VERCEL=1) ele só exporta o app.
if (!process.env.VERCEL) {
  const porta = process.env.PORT || 3000;
  app.listen(porta, () => console.log(`API rodando em http://localhost:${porta}`));
}

export default app;