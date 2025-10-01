import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

export default AppDataSource;
