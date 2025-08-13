import 'reflect-metadata';
import AppDataSource from '../data-source';

async function main() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
  console.log('migrations complete');
}

main().catch((err) => {
  console.error('migration failed', err);
  process.exit(1);
});
