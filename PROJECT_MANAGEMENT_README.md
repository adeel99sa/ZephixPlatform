# Project & Team Management Service

## Overview

The Project & Team Management service is a comprehensive NestJS module that provides enterprise-grade project management capabilities with role-based access control, team management, and AI-ready business requirements document processing.

## Features

### ✅ Core Project Management
- **Project CRUD Operations**: Create, read, update, and delete projects
- **Project Status Tracking**: Planning, Active, On Hold, Completed, Cancelled
- **Priority Management**: Low, Medium, High, Critical priorities
- **Budget Tracking**: Decimal precision budget management
- **Date Management**: Start and end date tracking
- **Business Requirements Document**: AI-ready BRD storage for future processing

### ✅ Team Management
- **Role-Based Access Control**: 6 predefined roles (Admin, Project Manager, Editor, Developer, Analyst, Viewer)
- **Team Member Management**: Add, update, and remove team members
- **Permission System**: Granular permissions based on roles
- **Team Creation**: Automatic team creation for each project

### ✅ Security & Authentication
- **JWT Authentication**: All endpoints protected with JWT tokens
- **Permission Guards**: Role-based access control on sensitive operations
- **User Isolation**: Users can only access projects they're members of
- **Admin-Only Operations**: Critical operations restricted to admin users

### ✅ API Documentation
- **Swagger Integration**: Complete API documentation with examples
- **Validation**: Comprehensive input validation with class-validator
- **Error Handling**: Proper HTTP status codes and error messages

## Database Schema

### Entities

#### Project Entity
```typescript
@Entity('projects')
export class Project {
  id: string;                    // UUID primary key
  name: string;                  // Project name (255 chars)
  description: string;           // Project description (text)
  status: ProjectStatus;         // Enum: planning, active, on_hold, completed, cancelled
  priority: ProjectPriority;     // Enum: low, medium, high, critical
  startDate: Date;              // Project start date
  endDate: Date;                // Project end date
  budget: number;               // Decimal precision budget
  businessRequirementsDocument: string; // AI-ready BRD content
  createdBy: User;              // Project creator
  team: Team;                   // Associated team
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last update timestamp
}
```

#### Team Entity
```typescript
@Entity('teams')
export class Team {
  id: string;                   // UUID primary key
  name: string;                  // Team name (255 chars)
  description: string;           // Team description (text)
  project: Project;              // Associated project
  members: TeamMember[];         // Team members
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
}
```

#### Role Entity
```typescript
@Entity('roles')
export class Role {
  id: string;                   // UUID primary key
  name: RoleType;               // Enum: admin, editor, viewer, project_manager, developer, analyst
  description: string;           // Role description (500 chars)
  permissions: string[];         // Array of permission strings
  teamMembers: TeamMember[];     // Associated team members
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
}
```

#### TeamMember Entity
```typescript
@Entity('team_members')
export class TeamMember {
  id: string;                   // UUID primary key
  team: Team;                   // Associated team
  user: User;                   // Associated user
  role: Role;                   // User's role in team
  joinedAt: Date;               // When user joined team
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last update timestamp
}
```

## API Endpoints

### Project Management

#### Create Project
```http
POST /api/projects
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Zephix Platform Development",
  "description": "Building an AI-driven project management platform",
  "status": "planning",
  "priority": "high",
  "startDate": "2025-01-15",
  "endDate": "2025-12-15",
  "budget": 500000.00,
  "businessRequirementsDocument": "Business Requirements Document content..."
}
```

#### Get User's Projects
```http
GET /api/projects
Authorization: Bearer <jwt_token>
```

#### Get Project by ID
```http
GET /api/projects/{projectId}
Authorization: Bearer <jwt_token>
```

#### Update Project
```http
PATCH /api/projects/{projectId}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "status": "active",
  "priority": "critical"
}
```

#### Delete Project (Admin Only)
```http
DELETE /api/projects/{projectId}
Authorization: Bearer <jwt_token>
```

### Team Management

#### Add Team Member (Admin Only)
```http
POST /api/projects/{projectId}/team/members
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "userId": "user-uuid-here",
  "role": "editor"
}
```

#### Update Team Member Role (Admin Only)
```http
PATCH /api/projects/{projectId}/team/members/{memberId}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "role": "developer"
}
```

#### Remove Team Member (Admin Only)
```http
DELETE /api/projects/{projectId}/team/members/{memberId}
Authorization: Bearer <jwt_token>
```

## Role Permissions

### Admin
- ✅ Create, read, update, delete projects
- ✅ Manage team members (add, update, remove)
- ✅ Full project administration

### Project Manager
- ✅ Create, read, update projects
- ✅ Manage team members (add, update, remove)
- ❌ Delete projects

### Editor
- ✅ Create, read, update projects
- ❌ Manage team members
- ❌ Delete projects

### Developer
- ✅ Read, update projects
- ❌ Create projects
- ❌ Manage team members
- ❌ Delete projects

### Analyst
- ✅ Read, update projects
- ❌ Create projects
- ❌ Manage team members
- ❌ Delete projects

### Viewer
- ✅ Read projects only
- ❌ All other operations

## Setup Instructions

### 1. Database Configuration

Ensure your PostgreSQL database is configured in `src/config/configuration.ts`:

```typescript
export default () => ({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'zephix_auth',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
  },
});
```

### 2. Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=zephix_auth

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=development
PORT=3000
```

### 3. Install Dependencies

The required dependencies are already included:
- `@nestjs/swagger` - API documentation
- `class-validator` - Input validation
- `class-transformer` - Data transformation
- `@nestjs/typeorm` - Database ORM
- `@nestjs/passport` - Authentication

### 4. Run the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 5. Database Migration

The application uses TypeORM's `synchronize` option for development. For production, you should:

1. Disable `synchronize` in production
2. Use TypeORM migrations
3. Run the role seeding manually if needed

## Role Seeding

The application automatically seeds default roles on startup:

- **Admin**: Full project administration permissions
- **Project Manager**: Project management permissions
- **Editor**: Content editing permissions
- **Developer**: Development-focused permissions
- **Analyst**: Analysis and reporting permissions
- **Viewer**: Read-only permissions

## Usage Examples

### Creating a Project

```typescript
// 1. Authenticate user and get JWT token
const token = await authService.login(user);

// 2. Create project
const project = await fetch('/api/projects', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My New Project',
    description: 'Project description',
    priority: 'high',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    budget: 100000
  })
});
```

### Adding Team Members

```typescript
// Add team member (Admin only)
const teamMember = await fetch(`/api/projects/${projectId}/team/members`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user-uuid-here',
    role: 'developer'
  })
});
```

## Error Handling

The service includes comprehensive error handling:

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Project or team member not found
- **409 Conflict**: User already a team member
- **500 Internal Server Error**: Server-side errors

## Security Features

- **JWT Authentication**: All endpoints require valid JWT tokens
- **Role-Based Access Control**: Permissions based on user roles
- **Input Validation**: Comprehensive validation using class-validator
- **SQL Injection Protection**: TypeORM parameterized queries
- **CORS Protection**: Configured CORS policies
- **Rate Limiting**: Throttler guard protection

## Future Enhancements

### AI Integration Ready
- **Business Requirements Document**: Structured storage for AI processing
- **Project Templates**: Predefined project structures
- **AI-Powered Planning**: Integration with AI planning tools

### Advanced Features
- **Project Templates**: Reusable project structures
- **Time Tracking**: Built-in time tracking capabilities
- **File Attachments**: Document and file management
- **Notifications**: Real-time project notifications
- **Reporting**: Advanced project reporting and analytics

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### API Testing
Use the provided Swagger documentation at `/api` endpoint for interactive API testing.

## Contributing

1. Follow the existing code structure
2. Add comprehensive tests for new features
3. Update API documentation
4. Follow TypeScript best practices
5. Ensure proper error handling

## License

MIT License - see LICENSE file for details. 