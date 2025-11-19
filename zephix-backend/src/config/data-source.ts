import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Task } from '../modules/projects/entities/task.entity';
import { TaskDependency } from '../modules/projects/entities/task-dependency.entity';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../modules/workspaces/entities/workspace-member.entity';
import { ProjectTemplate } from '../modules/templates/entities/project-template.entity';
// Remove these lines:
// import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
// import { AuthAuditLog } from '../modules/auth/entities/auth-audit.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
  // Fallback to individual connection params if DATABASE_URL not set
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'zephix_user',
  password: process.env.DATABASE_PASSWORD || 'zephix_password',
  database: process.env.DATABASE_NAME || 'zephix_auth_db',
  entities: [
    User,
    Organization,
    UserOrganization,
    Project,
    Task,
    TaskDependency,
    Workspace,
    WorkspaceMember,
    ProjectTemplate,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

export default AppDataSource;
