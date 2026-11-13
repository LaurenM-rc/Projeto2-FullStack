import { cpfValido, emailValido, dataValida } from '../models/validacoes.js';

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

export function validarCategoria(req, res, next) {
  const { nome, tipo } = req.body;
  const campos = {};

  if (!nome?.trim()) campos.nome = 'O nome é obrigatório.';
  else if (nome.trim().length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';

  if (!['entrada', 'saida'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  next();
}

export function validarFonteDestino(req, res, next) {
  const { nome, tipo, dia_fechamento, dia_vencimento, limite } = req.body;
  const campos = {};

  if (!nome?.trim()) campos.nome = 'O nome é obrigatório.';
  else if (nome.trim().length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';

  if (!['renda', 'conta', 'cartao_credito'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "renda", "conta" ou "cartao_credito".';
  } else if (tipo === 'cartao_credito') {
    const diaOk = (d) => Number.isInteger(Number(d)) && Number(d) >= 1 && Number(d) <= 31;
    if (!diaOk(dia_fechamento)) campos.dia_fechamento = 'Informe o dia de fechamento (1 a 31).';
    if (!diaOk(dia_vencimento)) campos.dia_vencimento = 'Informe o dia de vencimento (1 a 31).';

    const l = Number(limite);
    if (limite === undefined || limite === null || limite === '' || !Number.isFinite(l) || l <= 0 || l >= 1e10) {
      campos.limite = 'Informe o limite do cartão (maior que zero).';
    }
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  next();
}

export function validarLancamento(req, res, next) {
  const { tipo, descricao, valor, data, categoriaId, fonteDestinoId } = req.body;
  const campos = {};

  if (!['entrada', 'saida'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }

  if (!descricao?.trim()) campos.descricao = 'A descrição é obrigatória.';
  else if (descricao.trim().length > 120) campos.descricao = 'A descrição deve ter no máximo 120 caracteres.';

  const v = valor === undefined || valor === null || valor === '' ? Number.NaN : Number(valor);
  if (!Number.isFinite(v) || v <= 0) {
    campos.valor = 'O valor deve ser maior que zero.';
  } else if (v >= 1e10) {
    campos.valor = 'O valor é grande demais.';
  } else if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) {
    campos.valor = 'O valor deve ter no máximo 2 casas decimais.';
  }

  if (!dataValida(data)) campos.data = 'Informe uma data válida no formato AAAA-MM-DD.';

  const idOk = (x) => /^\d+$/.test(String(x)) && Number(x) > 0;
  if (!idOk(categoriaId)) campos.categoriaId = 'Informe a categoria.';
  if (!idOk(fonteDestinoId)) campos.fonteDestinoId = 'Informe a fonte/destino.';

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  next();
}