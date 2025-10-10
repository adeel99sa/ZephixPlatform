import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { OrganizationWorkspaceConfig } from '../modules/workspaces/entities/organization-workspace-config.entity';
import { UserWorkspace } from '../modules/workspaces/entities/user-workspace.entity';
import { Folder } from '../modules/folders/entities/folder.entity';
import { Team } from '../modules/teams/entities/team.entity';
import { TeamMember } from '../modules/teams/entities/team-member.entity';
import { Resource } from '../modules/resources/entities/resource.entity';
import { ResourceAllocation } from '../modules/resources/entities/resource-allocation.entity';
import { ResourceConflict } from '../modules/resources/entities/resource-conflict.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Task } from '../modules/tasks/entities/task.entity';
import { ProjectPhase } from '../modules/projects/entities/project-phase.entity';
import { ProjectAssignment } from '../modules/projects/entities/project-assignment.entity';
import { TaskDependency } from '../modules/tasks/entities/task-dependency.entity';
// Remove these lines:
// import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
// import { AuthAuditLog } from '../modules/auth/entities/auth-audit.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'zephix_user',
  password: process.env.DATABASE_PASSWORD || 'zephix_password',
  database: process.env.DATABASE_NAME || 'zephix_auth_db',
  entities: [
    User,
    Organization,
    UserOrganization,
    Workspace,
    OrganizationWorkspaceConfig,
    UserWorkspace,
    Folder,
    Team,
    TeamMember,
    Resource,
    ResourceAllocation,
    ResourceConflict,
    Project,
    Task,
    ProjectPhase,
    ProjectAssignment,
    TaskDependency,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

export default AppDataSource;