// src/models/Categoria.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Lancamento } from './Lancamento.js';

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

export const listarCategorias = (usuarioId) =>
  Categoria.findAll({
    where: { usuario_id: usuarioId },
    order: [['tipo', 'ASC'], ['nome', 'ASC']],
  });

export const buscarCategoria = (id, usuarioId) =>
  Categoria.findOne({ where: { id, usuario_id: usuarioId } });

export const criarCategoria = (usuarioId, { nome, tipo }) =>
  Categoria.create({ usuario_id: usuarioId, nome, tipo });

export const atualizarCategoria = (categoria, { nome, tipo }) =>
  categoria.update({ nome, tipo });

export const excluirCategoria = (categoria) => categoria.destroy();

export const contarLancamentos = (id, usuarioId) =>
  Lancamento.count({ where: { categoria_id: id, usuario_id: usuarioId } });