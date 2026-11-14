import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

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