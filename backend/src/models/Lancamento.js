import { DataTypes } from 'sequelize';
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

export const criarLancamento = (usuarioId, dados) =>
  Lancamento.create({ usuario_id: usuarioId, ...dados });

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