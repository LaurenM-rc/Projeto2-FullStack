import { hojeISO, mesAtualISO } from '../utils/formatters.js';

const STORAGE_KEY = 'cf_demo_db_v1';

const dadosIniciais = () => {
  const hoje = hojeISO();
  const mes = mesAtualISO();
  return {
    categorias: [
      { id: 1, nome: 'Salário', tipo: 'entrada' },
      { id: 2, nome: 'Freelance', tipo: 'entrada' },
      { id: 3, nome: 'Alimentação', tipo: 'saida' },
      { id: 4, nome: 'Moradia', tipo: 'saida' },
      { id: 5, nome: 'Transporte', tipo: 'saida' },
      { id: 6, nome: 'Lazer e Assinaturas', tipo: 'saida' },
    ],
    contas: [
      { id: 1, nome: 'Conta Corrente Itaú', tipo: 'conta_corrente', ehCartao: false, saldoInicial: 2500 },
      { id: 2, nome: 'Reserva Poupança', tipo: 'poupanca', ehCartao: false, saldoInicial: 5000 },
      { id: 3, nome: 'Carteira', tipo: 'carteira', ehCartao: false, saldoInicial: 180 },
      {
        id: 4,
        nome: 'Nubank Mastercard',
        tipo: 'cartao_credito',
        ehCartao: true,
        saldoInicial: 0,
        limite: 4500,
        diaFechamento: 10,
        diaVencimento: 17,
      },
      {
        id: 5,
        nome: 'Inter Visa',
        tipo: 'cartao_credito',
        ehCartao: true,
        saldoInicial: 0,
        limite: 3000,
        diaFechamento: 5,
        diaVencimento: 12,
      },
    ],
    lancamentos: [
      {
        id: 1,
        tipo: 'entrada',
        descricao: 'Salário Mensal',
        valor: 5200.0,
        data: `${mes}-05`,
        categoriaId: 1,
        fonteDestinoId: 1,
        totalParcelas: 1,
      },
      {
        id: 2,
        tipo: 'entrada',
        descricao: 'Projeto Web Freelance',
        valor: 1350.0,
        data: `${mes}-12`,
        categoriaId: 2,
        fonteDestinoId: 1,
        totalParcelas: 1,
      },
      {
        id: 3,
        tipo: 'saida',
        descricao: 'Aluguel e Condomínio',
        valor: 1650.0,
        data: `${mes}-06`,
        categoriaId: 4,
        fonteDestinoId: 1,
        totalParcelas: 1,
      },
      {
        id: 4,
        tipo: 'saida',
        descricao: 'Supermercado Mensal',
        valor: 780.5,
        data: hoje,
        categoriaId: 3,
        fonteDestinoId: 4,
        totalParcelas: 1,
        numeroParcela: 1,
      },
      {
        id: 5,
        tipo: 'saida',
        descricao: 'Notebook (Parcelado 3x)',
        valor: 100.0,
        data: hoje,
        categoriaId: 6,
        fonteDestinoId: 4,
        totalParcelas: 3,
        numeroParcela: 1,
      },
      {
        id: 6,
        tipo: 'saida',
        descricao: 'Combustível e App',
        valor: 320.0,
        data: hoje,
        categoriaId: 5,
        fonteDestinoId: 3,
        totalParcelas: 1,
      },
    ],
  };
};

function lerBanco() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignora
  }
  const inicial = dadosIniciais();
  salvarBanco(inicial);
  return inicial;
}

function salvarBanco(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignora
  }
}

export function atenderComMock(method, path, body) {
  const db = lerBanco();
  const [rota, queryString] = path.split('?');
  const params = new URLSearchParams(queryString || '');

  // Auth demo
  if (rota === '/auth/login' && method === 'POST') {
    return {
      token: 'demo-jwt-token',
      usuario: { id: 1, nome: 'Usuário Demonstração', email: body?.email || 'demo@utfpr.edu.br' },
    };
  }
  if (rota === '/auth/cadastro' && method === 'POST') {
    return { id: 1, nome: body?.nome || 'Novo Usuário', email: body?.email };
  }

  // Categorias
  if (rota === '/categorias' && method === 'GET') {
    return db.categorias;
  }
  if (rota === '/categorias' && method === 'POST') {
    const novo = { id: Date.now(), nome: body.nome, tipo: body.tipo };
    db.categorias.push(novo);
    salvarBanco(db);
    return novo;
  }
  if (rota.startsWith('/categorias/') && method === 'PUT') {
    const id = Number(rota.split('/')[2]);
    const idx = db.categorias.findIndex((c) => c.id === id);
    if (idx >= 0) {
      db.categorias[idx] = { ...db.categorias[idx], ...body };
      salvarBanco(db);
      return db.categorias[idx];
    }
  }
  if (rota.startsWith('/categorias/') && method === 'DELETE') {
    const id = Number(rota.split('/')[2]);
    db.categorias = db.categorias.filter((c) => c.id !== id);
    salvarBanco(db);
    return null;
  }

  // Contas e Cartões
  if ((rota === '/contas' || rota === '/cartoes') && method === 'GET') {
    if (rota === '/cartoes') {
      return db.contas.filter((c) => c.tipo === 'cartao_credito' || c.ehCartao);
    }
    return db.contas;
  }
  if ((rota === '/contas' || rota === '/cartoes') && method === 'POST') {
    const novo = { id: Date.now(), ...body };
    db.contas.push(novo);
    salvarBanco(db);
    return novo;
  }
  if ((rota.startsWith('/contas/') || rota.startsWith('/cartoes/')) && method === 'PUT') {
    const id = Number(rota.split('/')[2]);
    const idx = db.contas.findIndex((c) => c.id === id);
    if (idx >= 0) {
      db.contas[idx] = { ...db.contas[idx], ...body };
      salvarBanco(db);
      return db.contas[idx];
    }
  }
  if ((rota.startsWith('/contas/') || rota.startsWith('/cartoes/')) && method === 'DELETE') {
    const id = Number(rota.split('/')[2]);
    db.contas = db.contas.filter((c) => c.id !== id);
    salvarBanco(db);
    return null;
  }

  // Previsão de faturas do cartão
  if (rota.match(/^\/cartoes\/\d+\/faturas$/) && method === 'GET') {
    const id = Number(rota.split('/')[2]);
    const cartao = db.contas.find((c) => c.id === id) || {
      limite: 4500,
      diaFechamento: 10,
      diaVencimento: 17,
    };
    const itens = db.lancamentos.filter(
      (l) => Number(l.fonteDestinoId) === id && l.tipo === 'saida'
    );
    const totalAtual = itens.reduce((s, l) => s + Number(l.valor || 0), 0) || 880.5;
    const limiteUtilizado = Number((totalAtual + 420).toFixed(2));
    const mesBase = params.get('mes') || mesAtualISO();

    return {
      limite: cartao.limite || 4500,
      limiteUtilizado,
      limiteDisponivel: Math.max(0, (cartao.limite || 4500) - limiteUtilizado),
      previsoes: [
        { mes: `${mesBase} (Atual)`, total: totalAtual, quantidadeItens: itens.length || 2 },
        { mes: 'Próxima Fatura (+1 mês)', total: 310.0, quantidadeItens: 2 },
        { mes: 'Fatura Futura (+2 meses)', total: 110.0, quantidadeItens: 1 },
      ],
      itens,
    };
  }

  // Lançamentos
  if (rota === '/lancamentos' && method === 'GET') {
    let lista = [...db.lancamentos];
    const tipo = params.get('tipo');
    const catId = params.get('categoriaId');
    const fonteId = params.get('fonteDestinoId');
    const dataIni = params.get('dataInicio');
    const dataFim = params.get('dataFim');

    if (tipo) lista = lista.filter((l) => l.tipo === tipo);
    if (catId) lista = lista.filter((l) => String(l.categoriaId) === String(catId));
    if (fonteId) lista = lista.filter((l) => String(l.fonteDestinoId) === String(fonteId));
    if (dataIni) lista = lista.filter((l) => l.data >= dataIni);
    if (dataFim) lista = lista.filter((l) => l.data <= dataFim);

    const entradas = lista
      .filter((l) => l.tipo === 'entrada')
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const saidas = lista
      .filter((l) => l.tipo === 'saida')
      .reduce((s, l) => s + Number(l.valor || 0), 0);

    return {
      itens: lista,
      totais: { entradas, saidas, saldo: entradas - saidas },
      paginacao: { totalPaginas: 1, total: lista.length },
    };
  }
  if (rota === '/lancamentos' && method === 'POST') {
    const novo = { id: Date.now(), ...body };
    db.lancamentos.unshift(novo);
    salvarBanco(db);
    return novo;
  }
  if (rota.startsWith('/lancamentos/') && method === 'PUT') {
    const id = Number(rota.split('/')[2]);
    const idx = db.lancamentos.findIndex((l) => l.id === id);
    if (idx >= 0) {
      db.lancamentos[idx] = { ...db.lancamentos[idx], ...body };
      salvarBanco(db);
      return db.lancamentos[idx];
    }
  }
  if (rota.startsWith('/lancamentos/') && method === 'DELETE') {
    const id = Number(rota.split('/')[2]);
    db.lancamentos = db.lancamentos.filter((l) => l.id !== id);
    salvarBanco(db);
    return null;
  }

  // Relatórios
  if (rota === '/relatorios/resumo' && method === 'GET') {
    const entradas = db.lancamentos
      .filter((l) => l.tipo === 'entrada')
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const saidas = db.lancamentos
      .filter((l) => l.tipo === 'saida')
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }

  if (rota === '/relatorios/categorias' && method === 'GET') {
    const tipo = params.get('tipo') || 'saida';
    const cats = db.categorias.filter((c) => c.tipo === tipo);
    const lancs = db.lancamentos.filter((l) => l.tipo === tipo);
    const totalGeral = lancs.reduce((s, l) => s + Number(l.valor || 0), 0);

    return cats
      .map((c, idx) => {
        const total = lancs
          .filter((l) => Number(l.categoriaId) === c.id)
          .reduce((s, l) => s + Number(l.valor || 0), 0);
        const totalAnterior = total > 0 ? Number((total * (idx % 2 === 0 ? 0.88 : 1.12)).toFixed(2)) : 0;
        const percentual = totalGeral > 0 ? (total / totalGeral) * 100 : 0;
        const variacaoPercentual =
          totalAnterior > 0 ? ((total - totalAnterior) / totalAnterior) * 100 : 0;
        return {
          categoriaId: c.id,
          categoria: c.nome,
          total,
          percentual,
          totalAnterior,
          variacaoPercentual,
        };
      })
      .filter((item) => item.total > 0);
  }

  if ((rota === '/relatorios/fontes-destinos' || rota === '/relatorios/contas') && method === 'GET') {
    return db.contas.map((ct) => {
      const entradas = db.lancamentos
        .filter((l) => Number(l.fonteDestinoId) === ct.id && l.tipo === 'entrada')
        .reduce((s, l) => s + Number(l.valor || 0), 0);
      const saidas = db.lancamentos
        .filter((l) => Number(l.fonteDestinoId) === ct.id && l.tipo === 'saida')
        .reduce((s, l) => s + Number(l.valor || 0), 0);
      return {
        id: ct.id,
        nome: ct.nome,
        entradas,
        saidas,
        saldo: entradas - saidas,
      };
    });
  }

  return [];
}
