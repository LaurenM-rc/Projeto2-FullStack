import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { FonteDestino } from './FonteDestino.js';
import { Lancamento } from './Lancamento.js';

// Total por categoria no período, para um tipo ('entrada' ou 'saida')
export function totaisPorCategoria(usuarioId, tipo, inicio, fim) {
  return sequelize.query(
    `SELECT c.id, c.nome, SUM(l.valor) AS total
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
      WHERE l.usuario_id = $1
        AND l.tipo = $2
        AND l.data BETWEEN $3 AND $4
      GROUP BY c.id, c.nome`,
    { bind: [usuarioId, tipo, inicio, fim], type: QueryTypes.SELECT }
  );
}

// Total movimentado por fonte/destino no período, separado por tipo de lançamento.
// O LEFT JOIN traz também as fontes sem movimento (para listar contas com saldo zero).
export function totaisPorFonteDestino(usuarioId, inicio, fim) {
  return sequelize.query(
    `SELECT f.id, f.nome, f.tipo AS tipo_fonte, l.tipo AS tipo_lancamento, SUM(l.valor) AS total
       FROM fontes_destinos f
       LEFT JOIN lancamentos l
              ON l.fonte_destino_id = f.id
             AND l.usuario_id = $1
             AND l.data BETWEEN $2 AND $3
      WHERE f.usuario_id = $1
      GROUP BY f.id, f.nome, f.tipo, l.tipo`,
    { bind: [usuarioId, inicio, fim], type: QueryTypes.SELECT }
  );
}

// Cartões do usuário e todas as saídas lançadas neles
export async function cartoesComLancamentos(usuarioId) {
  const cartoes = await FonteDestino.findAll({
    where: { usuario_id: usuarioId, tipo: 'cartao_credito' },
    order: [['nome', 'ASC']],
  });

  const lancamentos = cartoes.length
    ? await Lancamento.findAll({
        where: {
          usuario_id: usuarioId,
          tipo: 'saida',
          fonte_destino_id: cartoes.map((c) => c.id),
        },
        order: [['data', 'ASC'], ['id', 'ASC']],
      })
    : [];

  return { cartoes, lancamentos };
}