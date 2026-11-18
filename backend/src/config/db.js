import 'dotenv/config';
import { createRequire } from 'module';
import { Sequelize } from 'sequelize';

const require = createRequire(import.meta.url);
const pg = require('pg');

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: 'pg',
  logging: false,
  dialectOptions: { ssl: { require: true } },
  pool: { max: 2, min: 0, acquire: 30000, idle: 5000 },
});
