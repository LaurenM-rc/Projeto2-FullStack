import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sequelize } from '../src/config/db.js';

const pasta = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(pasta, 'schema.sql'), 'utf8');

try {
  await sequelize.authenticate();
  console.log('Conectado ao Neon.');

  if (process.argv.includes('--reset')) {
    await sequelize.query('DROP TABLE IF EXISTS lancamentos, fontes_destinos, categorias, usuarios CASCADE');
    console.log('Tabelas antigas removidas.');
  }
  await sequelize.query(sql);
  console.log('Banco pronto: tabelas criadas.');
} catch (erro) {
  console.error('Erro ao criar o banco:', erro.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}