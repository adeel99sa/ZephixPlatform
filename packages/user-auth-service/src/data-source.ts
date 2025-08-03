import { DataSource } from 'typeorm';
import { createDatabaseConfig } from './infrastructure/config/database.config';

// This is the only export TypeORM CLI needs for migrations!
export default new DataSource(createDatabaseConfig());
