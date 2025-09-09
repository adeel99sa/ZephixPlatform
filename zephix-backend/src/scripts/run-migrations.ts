import 'reflect-metadata';
import AppDataSource from '../config/data-source';

async function main() {
  await AppDataSource.initialize();
  console.log('Running migrations...');
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
  console.log('Migrations completed');
}

main().catch(console.error);
