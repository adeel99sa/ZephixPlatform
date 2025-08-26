import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true, // This will create tables based on entities
  entities: ['src/**/*.entity.ts'],
  logging: true,
});

AppDataSource.initialize()
  .then(() => {
    console.log('Database synchronized');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
