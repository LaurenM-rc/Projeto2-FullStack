// src/models/FonteDestino.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Lancamento } from './Lancamento.js';

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

export const listarFontesDestinos = (usuarioId) =>
  FonteDestino.findAll({
    where: { usuario_id: usuarioId },
    order: [['tipo', 'ASC'], ['nome', 'ASC']],
  });

export const buscarFonteDestino = (id, usuarioId) =>
  FonteDestino.findOne({ where: { id, usuario_id: usuarioId } });

export const criarFonteDestino = (usuarioId, dados) =>
  FonteDestino.create({ usuario_id: usuarioId, ...dados });

export const atualizarFonteDestino = (fonte, dados) => fonte.update(dados);

export const excluirFonteDestino = (fonte) => fonte.destroy();

export const contarLancamentosDaFonte = (id, usuarioId) =>
  Lancamento.count({ where: { fonte_destino_id: id, usuario_id: usuarioId } });