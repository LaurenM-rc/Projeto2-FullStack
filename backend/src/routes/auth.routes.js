import { Router } from 'express';
import bcrypt from 'bcrypt';
import { validarCadastro } from '../middlewares/validacao.js';
import { criarComPadrao } from '../models/Usuario.js';

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

export default router;