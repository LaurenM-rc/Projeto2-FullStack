import { randomUUID } from 'node:crypto';
import { DataTypes, Op, fn, col } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Lancamento = sequelize.define(
  'Lancamento',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.STRING(7), allowNull: false },
    descricao: { type: DataTypes.STRING(120), allowNull: false },
    valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    data: { type: DataTypes.DATEONLY, allowNull: false },
    categoria_id: { type: DataTypes.INTEGER, allowNull: false },
    fonte_destino_id: { type: DataTypes.INTEGER, allowNull: false },
    parcela_atual: { type: DataTypes.SMALLINT, defaultValue: 1 },
    total_parcelas: { type: DataTypes.SMALLINT, defaultValue: 1 },
    grupo_parcelamento: { type: DataTypes.UUID },
    criado_em: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: 'lancamentos', timestamps: false }
);

// Cria 1 ou N lançamentos de uma vez, dentro de uma transação:
// ou todas as parcelas são gravadas, ou nenhuma.
export function criarLancamentos(usuarioId, dadosBase, valoresParcelas) {
  const total = valoresParcelas.length;
  const grupo = total > 1 ? randomUUID() : null;

  const registros = valoresParcelas.map((valor, i) => ({
    usuario_id: usuarioId,
    ...dadosBase,
    valor,
    parcela_atual: i + 1,
    total_parcelas: total,
    grupo_parcelamento: grupo,
  }));

  return sequelize.transaction((t) => Lancamento.bulkCreate(registros, { transaction: t }));
}

// Converte do formato do banco (snake_case) para o da API (camelCase)
export const formatarLancamento = (l) => ({
  id: l.id,
  tipo: l.tipo,
  descricao: l.descricao,
  valor: Number(l.valor),
  data: l.data,
  categoriaId: l.categoria_id,
  fonteDestinoId: l.fonte_destino_id,
  parcelaAtual: l.parcela_atual,
  totalParcelas: l.total_parcelas,
  grupoParcelamento: l.grupo_parcelamento ?? null,
});

export async function listarLancamentos(usuarioId, filtros, pagina, porPagina) {
  const where = {
    usuario_id: usuarioId,
    data: { [Op.between]: [filtros.inicio, filtros.fim] },
  };
  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.categoriaId) where.categoria_id = filtros.categoriaId;
  if (filtros.fonteDestinoId) where.fonte_destino_id = filtros.fonteDestinoId;

  const [lista, somas] = await Promise.all([
    Lancamento.findAndCountAll({
      where,
      order: [['data', 'DESC'], ['id', 'DESC']],
      limit: porPagina,
      offset: (pagina - 1) * porPagina,
    }),
    Lancamento.findAll({
      where,
      attributes: ['tipo', [fn('SUM', col('valor')), 'total']],
      group: ['tipo'],
      raw: true,
    }),
  ]);

  const somaDe = (tipo) => Number(somas.find((s) => s.tipo === tipo)?.total ?? 0);
  return {
    lancamentos: lista.rows,
    total: lista.count,
    entradas: somaDe('entrada'),
    saidas: somaDe('saida'),
  };
}

export const buscarLancamento = (id, usuarioId) =>
  Lancamento.findOne({ where: { id, usuario_id: usuarioId } });

export async function atualizarLancamento(lancamento, dados) {
  // Compra parcelada: descrição e categoria valem para todas as parcelas
  if (lancamento.grupo_parcelamento) {
    await Lancamento.update(
      { descricao: dados.descricao, categoria_id: dados.categoria_id },
      {
        where: {
          grupo_parcelamento: lancamento.grupo_parcelamento,
          usuario_id: lancamento.usuario_id,
        },
      }
    );
    return lancamento.reload();
  }
  return lancamento.update(dados);
}

export async function excluirLancamento(lancamento, todasParcelas) {
  if (todasParcelas && lancamento.grupo_parcelamento) {
    return Lancamento.destroy({
      where: {
        grupo_parcelamento: lancamento.grupo_parcelamento,
        usuario_id: lancamento.usuario_id,
      },
    });
  }
  return lancamento.destroy();
}