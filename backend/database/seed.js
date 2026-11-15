// Carga inicial para a demonstração: 2 usuários, 3 meses de lançamentos,
// compras parceladas no cartão e uma compra no dia do fechamento.

import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { sequelize } from '../src/config/db.js';
import { Usuario } from '../src/models/Usuario.js';
import { Categoria } from '../src/models/Categoria.js';
import { FonteDestino } from '../src/models/FonteDestino.js';
import { Lancamento } from '../src/models/Lancamento.js';
import { criarPadrao } from '../src/models/padrao.js';
import { dividirEmParcelas } from '../src/models/parcelas.js';

const SENHA = 'Senha1234';

// Data AAAA-MM-DD. offset = meses a partir do mês atual (0 = este mês, -1 = mês passado...)
// Os 3 meses são sempre relativos a hoje, então o seed nunca fica "velho".
function data(offset, dia) {
  const hoje = new Date();
  const d = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() + offset, dia));
  return d.toISOString().slice(0, 10);
}

// CPFs de teste com dígitos verificadores válidos
const USUARIOS = [
  {
    nome: 'Lauren Teste', email: 'lauren@teste.com', cpf: '52998224725',
    salario: 3500, aluguel: 1200, mercado: [420, 480, 450.9],
    parcelada: { descricao: 'Notebook', total: 3000, parcelas: 10 },
  },
  {
    nome: 'Manuella Teste', email: 'manuella@teste.com', cpf: '11144477735',
    salario: 5200, aluguel: 1800, mercado: [610, 590, 700],
    parcelada: { descricao: 'Celular', total: 2400, parcelas: 12 },
  },
];

async function criarDadosDoUsuario(u, senhaHash, t) {
  const usuario = await Usuario.create(
    { nome: u.nome, email: u.email, cpf: u.cpf, senha_hash: senhaHash },
    { transaction: t }
  );
  const usuarioId = usuario.id;

  // Categorias padrão + "Conta corrente"
  await criarPadrao(usuarioId, t);

  // Fontes/destinos extras: uma renda, uma conta e dois cartões
  await FonteDestino.bulkCreate(
    [
      { usuario_id: usuarioId, nome: 'Freelance', tipo: 'renda' },
      { usuario_id: usuarioId, nome: 'Poupança', tipo: 'conta' },
      { usuario_id: usuarioId, nome: 'Cartão Nubank', tipo: 'cartao_credito', dia_fechamento: 3, dia_vencimento: 10, limite: 3000 },
      { usuario_id: usuarioId, nome: 'Visa crédito', tipo: 'cartao_credito', dia_fechamento: 25, dia_vencimento: 5, limite: 5000 },
    ],
    { transaction: t }
  );

  const categorias = await Categoria.findAll({ where: { usuario_id: usuarioId }, transaction: t });
  const fontes = await FonteDestino.findAll({ where: { usuario_id: usuarioId }, transaction: t });
  const cat = (nome, tipo) => categorias.find((c) => c.nome === nome && c.tipo === tipo).id;
  const fonte = (nome) => fontes.find((f) => f.nome === nome).id;

  const lancamentos = [];

  // Lançamento à vista
  const add = (tipo, descricao, valor, dt, categoria, fonteNome) =>
    lancamentos.push({
      usuario_id: usuarioId, tipo, descricao, valor, data: dt,
      categoria_id: cat(categoria, tipo), fonte_destino_id: fonte(fonteNome),
      parcela_atual: 1, total_parcelas: 1, grupo_parcelamento: null,
    });

  // Compra parcelada: uma linha por parcela, todas com a data da compra
  const parcelar = (descricao, total, parcelas, dt, categoria, fonteNome) => {
    const grupo = randomUUID();
    dividirEmParcelas(total, parcelas).forEach((valor, k) =>
      lancamentos.push({
        usuario_id: usuarioId, tipo: 'saida', descricao, valor, data: dt,
        categoria_id: cat(categoria, 'saida'), fonte_destino_id: fonte(fonteNome),
        parcela_atual: k + 1, total_parcelas: parcelas, grupo_parcelamento: grupo,
      })
    );
  };

  // 3 meses: dois atrás, o passado e o atual
  for (const mes of [-2, -1, 0]) {
    const i = mes + 2; // 0, 1, 2
    add('entrada', 'Salário', u.salario, data(mes, 5), 'Salário', 'Conta corrente');
    add('saida', 'Aluguel', u.aluguel, data(mes, 8), 'Moradia', 'Conta corrente');
    add('saida', 'Mercado', u.mercado[i], data(mes, 12), 'Alimentação', 'Conta corrente');
    add('saida', 'Plano de saúde', 220, data(mes, 15), 'Saúde', 'Conta corrente');
    add('saida', 'Combustível', 180 + i * 15, data(mes, 18), 'Mobilidade', 'Visa crédito');
    add('saida', 'Streaming e cinema', 60, data(mes, 20), 'Lazer', 'Cartão Nubank');
    add('saida', 'Delivery', 90 + i * 20, data(mes, 22), 'Alimentação', 'Cartão Nubank');
    add('entrada', 'Rendimento da poupança', 35, data(mes, 27), 'Outros', 'Poupança');
    if (i > 0) add('entrada', 'Projeto freelance', 600, data(mes, 14), 'Outros', 'Freelance');
  }

  // Compras parceladas no cartão
  parcelar(u.parcelada.descricao, u.parcelada.total, u.parcelada.parcelas, data(-2, 20), 'Educação', 'Visa crédito');
  parcelar('Curso online', 100, 3, data(-1, 10), 'Educação', 'Cartão Nubank'); // 33,34 + 33,33 + 33,33

  // Compra no dia do fechamento do Nubank (dia 3): cai na fatura do mês seguinte
  add('saida', 'Compra no dia do fechamento', 50, data(0, 3), 'Outros', 'Cartão Nubank');

  await Lancamento.bulkCreate(lancamentos, { transaction: t });
  return lancamentos.length;
}

try {
  await sequelize.authenticate();
  const senhaHash = await bcrypt.hash(SENHA, 10);

  await sequelize.transaction(async (t) => {
    await sequelize.query(
      'TRUNCATE lancamentos, fontes_destinos, categorias, usuarios RESTART IDENTITY CASCADE',
      { transaction: t }
    );
    for (const u of USUARIOS) {
      const total = await criarDadosDoUsuario(u, senhaHash, t);
      console.log(`${u.email}: ${total} lançamentos criados.`);
    }
  });

  console.log(`Seed concluído. Faça login com lauren@teste.com ou manuella@teste.com (senha ${SENHA}).`);
} catch (erro) {
  console.error('Erro no seed:', erro.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}