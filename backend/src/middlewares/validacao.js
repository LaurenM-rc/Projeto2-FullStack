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
  const { tipo, descricao, valor, data, categoriaId, fonteDestinoId, parcelas } = req.body;
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
  if (parcelas !== undefined && parcelas !== null && parcelas !== '') {
    if (!/^\d+$/.test(String(parcelas)) || Number(parcelas) < 1 || Number(parcelas) > 48) {
      campos.parcelas = 'O número de parcelas deve ser um inteiro de 1 a 48.';
    }
  }
  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  next();
}

export function validarFiltrosLancamentos(req, res, next) {
  const { inicio, fim, tipo, categoriaId, fonteDestinoId, pagina, porPagina } = req.query;
  const campos = {};

  // Período: os dois juntos ou nenhum (sem nenhum, usa o mês corrente)
  if ((inicio === undefined) !== (fim === undefined)) {
    campos[inicio === undefined ? 'inicio' : 'fim'] = 'Informe inicio e fim juntos.';
  } else if (inicio !== undefined) {
    if (!dataValida(inicio)) campos.inicio = 'Data inicial inválida. Use AAAA-MM-DD.';
    if (!dataValida(fim)) campos.fim = 'Data final inválida. Use AAAA-MM-DD.';
    if (!campos.inicio && !campos.fim && inicio > fim) {
      campos.fim = 'A data final deve ser igual ou posterior à inicial.';
    }
  }

  if (tipo !== undefined && !['entrada', 'saida'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }

  const inteiroPositivo = (x) => /^\d+$/.test(String(x)) && Number(x) > 0;
  if (categoriaId !== undefined && !inteiroPositivo(categoriaId)) {
    campos.categoriaId = 'Categoria inválida.';
  }
  if (fonteDestinoId !== undefined && !inteiroPositivo(fonteDestinoId)) {
    campos.fonteDestinoId = 'Fonte/destino inválida.';
  }
  if (pagina !== undefined && !inteiroPositivo(pagina)) {
    campos.pagina = 'A página deve ser um inteiro maior que zero.';
  }
  if (porPagina !== undefined && (!inteiroPositivo(porPagina) || Number(porPagina) > 100)) {
    campos.porPagina = 'Itens por página deve ser um inteiro entre 1 e 100.';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Parâmetros inválidos.', campos });
  }
  next();
}

export function validarPeriodo(req, res, next) {
  const { inicio, fim } = req.query;
  const campos = {};

  if (!dataValida(inicio)) campos.inicio = 'Informe a data inicial no formato AAAA-MM-DD.';
  if (!dataValida(fim)) campos.fim = 'Informe a data final no formato AAAA-MM-DD.';
  if (!campos.inicio && !campos.fim && inicio > fim) {
    campos.fim = 'A data final deve ser igual ou posterior à inicial.';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Parâmetros inválidos.', campos });
  }
  next();
}

export function validarMeses(req, res, next) {
  const { meses } = req.query;
  if (meses !== undefined && (!/^\d+$/.test(String(meses)) || Number(meses) < 1 || Number(meses) > 12)) {
    return res.status(400).json({
      erro: 'Parâmetros inválidos.',
      campos: { meses: 'Informe um número de meses de 1 a 12.' },
    });
  }
  next();
}