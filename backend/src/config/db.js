import 'dotenv/config';
import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true } },
  pool: { max: 2, min: 0, acquire: 30000, idle: 5000 },
});