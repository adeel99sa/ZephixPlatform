import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Task } from '../modules/projects/entities/task.entity';
// Remove these lines:
// import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
// import { AuthAuditLog } from '../modules/auth/entities/auth-audit.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'zephix_user',
  password: process.env.DATABASE_PASSWORD || 'zephix_password',
  database: process.env.DATABASE_NAME || 'zephix_auth_db',
  entities: [
    User,
    Organization,
    Project,
    Task,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

// Add this line for default export
export default AppDataSource;