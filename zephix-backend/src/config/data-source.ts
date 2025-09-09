import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Import ONLY ESSENTIAL entities (avoiding ALL circular dependencies)
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { ProjectPhase } from '../modules/projects/entities/project-phase.entity';
import { Template } from '../modules/templates/entities/template.entity';
import { WorkItem } from '../modules/work-items/entities/work-item.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { EmailVerification } from '../modules/auth/entities/email-verification.entity';
import { Feedback } from '../feedback/entities/feedback.entity';
import { Waitlist } from '../waitlist/entities/waitlist.entity';
import { ProjectAssignment } from '../modules/projects/entities/project-assignment.entity';
import { Task } from '../modules/projects/entities/task.entity';
import { TaskDependency } from '../modules/projects/entities/task-dependency.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DATABASE_USERNAME || 'zephix_user',
  password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
  database: process.env.DB_DATABASE || process.env.DATABASE_NAME || 'zephix_development',
  url: process.env.DATABASE_URL,
  entities: [
    // Core entities only - no circular dependencies
    User,
    Organization,
    UserOrganization,
    Project,
    ProjectPhase,
    Template,
    WorkItem,
    RefreshToken,
    EmailVerification,
    Feedback,
    Waitlist,
    ProjectAssignment,
    Task,
    TaskDependency,
    User,
  ],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});