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