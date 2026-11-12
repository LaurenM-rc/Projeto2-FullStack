import { cpfValido, emailValido } from '../models/validacoes.js';

export function validarCadastro(req, res, next) {
  const { nome, email, cpf, senha, confirmarSenha } = req.body;
  const campos = {};

  if (!nome?.trim()) campos.nome = 'O nome é obrigatório.';
  if (!emailValido(email ?? '')) campos.email = 'Informe um e-mail válido.';
  if (!cpfValido(cpf ?? '')) campos.cpf = 'Informe um CPF válido.';
  if (!senha || senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    campos.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  }
  if (senha !== confirmarSenha) campos.confirmarSenha = 'As senhas não conferem.';

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  next();
}