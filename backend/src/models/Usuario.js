import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { criarPadrao } from './padrao.js';

export const Usuario = sequelize.define(
  'Usuario',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false },
    cpf: { type: DataTypes.CHAR(11), allowNull: false },
    senha_hash: { type: DataTypes.STRING(100), allowNull: false },
    criado_em: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: 'usuarios', timestamps: false }
);

export function criarComPadrao({ nome, email, cpf, senhaHash }) {
  return sequelize.transaction(async (t) => {
    const usuario = await Usuario.create(
      { nome, email, cpf, senha_hash: senhaHash },
      { transaction: t }
    );
    await criarPadrao(usuario.id, t);
    return { id: usuario.id, nome: usuario.nome, email: usuario.email };
  });
}

export function buscarPorEmail(email) {
  return Usuario.findOne({ where: { email } });
}

export function buscarPorId(id) {
  return Usuario.findByPk(id, { attributes: ['id', 'nome', 'email'] });
}