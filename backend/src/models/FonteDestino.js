// src/models/FonteDestino.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const FonteDestino = sequelize.define(
  'FonteDestino',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    nome: { type: DataTypes.STRING(60), allowNull: false },
    tipo: { type: DataTypes.STRING(14), allowNull: false },
    dia_fechamento: { type: DataTypes.SMALLINT },
    dia_vencimento: { type: DataTypes.SMALLINT },
    limite: { type: DataTypes.DECIMAL(12, 2) },
  },
  { tableName: 'fontes_destinos', timestamps: false }
);