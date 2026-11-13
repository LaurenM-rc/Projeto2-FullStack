import { Router } from 'express';
import bcrypt from 'bcrypt';
import { validarCadastro } from '../middlewares/validacao.js';
import jwt from 'jsonwebtoken';
import { autenticar } from '../middlewares/autenticar.js';
import { criarComPadrao, buscarPorEmail, buscarPorId } from '../models/Usuario.js';

const router = Router();

router.post('/cadastro', validarCadastro, async (req, res, next) => {
  const { nome, email, cpf, senha } = req.body;
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await criarComPadrao({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      cpf: cpf.replace(/\D/g, ''),
      senhaHash,
    });
    return res.status(201).json(usuario);
  } catch (erro) {
    if (erro.original?.code === '23505') {
      const campo = erro.original.constraint?.includes('cpf') ? 'cpf' : 'email';
      return res.status(409).json({
        erro: 'Usuário já cadastrado.',
        campos: { [campo]: `Já existe um usuário com este ${campo === 'cpf' ? 'CPF' : 'e-mail'}.` },
      });
    }
    return next(erro);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Informe e-mail e senha.' });
    }

    const usuario = await buscarPorEmail(String(email).trim().toLowerCase());
    const senhaOk = usuario && (await bcrypt.compare(senha, usuario.senha_hash));
    if (!senhaOk) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const token = jwt.sign({}, process.env.JWT_SECRET, {
      subject: String(usuario.id),
      expiresIn: '1h',
    });
    return res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    });
  } catch (erro) {
    next(erro);
  }
});

router.get('/me', autenticar, async (req, res, next) => {
  try {
    const usuario = await buscarPorId(req.usuarioId);
    if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado.' });
    return res.json(usuario);
  } catch (erro) {
    next(erro);
  }
});

export default router;