import { Categoria } from './Categoria.js';
import { FonteDestino } from './FonteDestino.js';

const SAIDA = ['Alimentação', 'Moradia', 'Saúde', 'Mobilidade', 'Lazer', 'Educação', 'Outros'];
const ENTRADA = ['Salário', 'Outros'];

export async function criarPadrao(usuarioId, transaction) {
  const categorias = [
    ...SAIDA.map((nome) => ({ usuario_id: usuarioId, nome, tipo: 'saida' })),
    ...ENTRADA.map((nome) => ({ usuario_id: usuarioId, nome, tipo: 'entrada' })),
  ];
  await Categoria.bulkCreate(categorias, { transaction });
  await FonteDestino.create(
    { usuario_id: usuarioId, nome: 'Conta corrente', tipo: 'conta' },
    { transaction }
  );
}