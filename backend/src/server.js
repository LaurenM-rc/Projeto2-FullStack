import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize } from './config/db.js';
import './models/index.js';
import { naoEncontrado, tratarErros } from './middlewares/erros.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/api/saude', async (req, res) => {
  const [rows] = await sequelize.query('SELECT NOW() AS agora');
  res.json({ status: 'ok', banco: rows[0].agora });
});

app.use(naoEncontrado);
app.use(tratarErros);

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`API rodando em http://localhost:${porta}`));