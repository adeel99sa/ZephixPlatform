import { DataSource } from 'typeorm';
import { Waitlist } from '../waitlist/entities/waitlist.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'zephix_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'zephix_development',
  entities: [Waitlist],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
