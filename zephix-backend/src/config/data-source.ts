import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Task } from '../modules/projects/entities/task.entity';
import { TaskDependency as LegacyTaskDependency } from '../modules/projects/entities/task-dependency.entity';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../modules/workspaces/entities/workspace-member.entity';
import { ProjectTemplate } from '../modules/templates/entities/project-template.entity';
import { Portfolio } from '../modules/portfolios/entities/portfolio.entity';
import { Program } from '../modules/programs/entities/program.entity';
import { PortfolioProject } from '../modules/portfolios/entities/portfolio-project.entity';
import { Dashboard } from '../modules/dashboards/entities/dashboard.entity';
import { DashboardWidget } from '../modules/dashboards/entities/dashboard-widget.entity';
import { DashboardTemplate } from '../modules/dashboards/entities/dashboard-template.entity';
import { MetricDefinition } from '../modules/dashboards/entities/metric-definition.entity';
import { WorkTask } from '../modules/work-management/entities/work-task.entity';
import { WorkTaskDependency } from '../modules/work-management/entities/task-dependency.entity';
import { TaskComment } from '../modules/work-management/entities/task-comment.entity';
import { TaskActivity } from '../modules/work-management/entities/task-activity.entity';
// Remove these lines:
// import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
// import { AuthAuditLog } from '../modules/auth/entities/auth-audit.entity';

// Log migration database connection details (redact password)
const migrationDbUrl = process.env.DATABASE_URL || '';
const migrationDbUrlMasked = migrationDbUrl.replace(/:[^:@]+@/, ':****@');
const migrationDbUrlObj = migrationDbUrl ? new URL(migrationDbUrl) : null;
console.log('🔍 Migration DataSource Config:', {
  host: migrationDbUrlObj?.hostname || 'N/A',
  port: migrationDbUrlObj?.port || 'N/A',
  database: migrationDbUrlObj?.pathname?.replace('/', '') || 'N/A',
  username: migrationDbUrlObj?.username || 'N/A',
  url: migrationDbUrlMasked,
});

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
    LegacyTaskDependency,
    Workspace,
    WorkspaceMember,
    ProjectTemplate,
    Portfolio,
    Program,
    PortfolioProject,
    Dashboard,
    DashboardWidget,
    DashboardTemplate,
    MetricDefinition,
    WorkTask,
    WorkTaskDependency,
    TaskComment,
    TaskActivity,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

export default AppDataSource;
