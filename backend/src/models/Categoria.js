// src/models/Categoria.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Categoria = sequelize.define(
  'Categoria',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    nome: { type: DataTypes.STRING(60), allowNull: false },
    tipo: { type: DataTypes.STRING(7), allowNull: false },
  },
  { tableName: 'categorias', timestamps: false }
);