require('dotenv').config(); // Ensure env vars are loaded

const { DataSource } = require('typeorm');
const { UserEntity } = require('../../domain/entities/user.entity');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'zephix_user',
  password: process.env.DB_PASSWORD || 'zephix_secure_password_2024',
  database: process.env.DB_DATABASE || 'zephix_auth_db',
  synchronize: true, // This will create/update tables automatically
  logging: process.env.DB_LOGGING === 'true' || false,
  entities: [UserEntity],
  // Enable UUID extension for PostgreSQL
  extra: {
    // This ensures UUID generation works properly
  }
});

module.exports = { AppDataSource }; 