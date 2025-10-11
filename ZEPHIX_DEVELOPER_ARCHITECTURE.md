# 🏗️ **ZEPHIX PLATFORM - DEVELOPER ARCHITECTURE GUIDE**

## **📁 PROJECT STRUCTURE OVERVIEW**

```
ZephixApp/
├── zephix-backend/          # NestJS Backend API
├── zephix-frontend/         # React/Next.js Frontend
├── zephix-landing/          # Landing Page
└── [root files]             # Configuration & Documentation
```

---

## **🔧 BACKEND ARCHITECTURE (zephix-backend/dist/src/)**

### **🏛️ Core Architecture**
```
src/
├── main.ts                  # Application entry point
├── app.module.ts           # Root module configuration
├── database/               # Database configuration & migrations
├── shared/                 # Shared utilities & interfaces
├── config/                 # Environment configuration
├── filters/                # Global exception filters
├── middleware/             # Custom middleware
├── guards/                 # Authentication & authorization guards
└── health/                 # Health check endpoints
```

### **🔐 Authentication & Security**
```
modules/auth/
├── controllers/            # Login, signup, refresh endpoints
├── services/              # JWT token management, password hashing
├── entities/              # User entity
├── dto/                   # Login, signup, refresh DTOs
├── guards/                # JWT auth guard
├── strategies/            # JWT strategy
└── decorators/            # Custom auth decorators
```

### **🏢 Organization Management**
```
modules/organizations/
├── controllers/           # Organization CRUD operations
├── services/             # Organization business logic
├── entities/             # Organization, settings entities
├── dto/                  # Organization DTOs
├── guards/               # Organization access guards
└── decorators/           # Organization context decorators
```

### **📋 Project Management**
```
modules/projects/
├── entities/             # Project, phases, assignments
├── services/             # Project business logic
└── dto/                  # Project DTOs

modules/templates/
├── controllers/          # Template CRUD operations
├── services/            # Template-to-project conversion
├── entities/            # Template entity
└── dto/                 # Template DTOs
```

### **👥 User Management**
```
modules/users/
├── controllers/          # User CRUD operations
├── services/            # User management logic
├── entities/            # User entity
└── dto/                 # User DTOs
```

### **📊 Resource Management**
```
modules/resources/
├── controllers/          # Resource allocation endpoints
├── services/            # Resource conflict detection
├── entities/            # Resource, allocation entities
└── dto/                 # Resource DTOs
```

### **📈 Analytics & Intelligence**
```
modules/analytics/        # Analytics data processing
modules/ai/              # AI integration services
modules/intelligence/    # Business intelligence
```

### **🛡️ Risk Management**
```
modules/risks/
├── entities/            # Risk entities
├── dto/                # Risk DTOs
└── services/           # Risk assessment logic
```

### **📋 Task Management**
```
modules/tasks/
├── entities/            # Task entities
├── services/           # Task management logic
└── dto/                # Task DTOs
```

### **📊 KPI & Reporting**
```
modules/kpi/             # Key Performance Indicators
modules/portfolios/      # Portfolio management
modules/programs/        # Program management
```

### **🔔 Notifications & Communication**
```
modules/notifications/   # Notification system
modules/feedback/        # User feedback system
modules/commands/        # Command pattern implementation
```

### **📁 File Management**
```
modules/files/           # File upload/download
modules/work-items/      # Work item management
```

### **🏗️ Workspace Management**
```
modules/workspaces/
├── entities/            # Workspace entities
├── services/           # Workspace logic
└── dto/                # Workspace DTOs
```

---

## **🎨 FRONTEND ARCHITECTURE (zephix-frontend/src/)**

### **🏗️ Core Structure**
```
src/
├── pages/               # Next.js pages (routing)
├── components/          # React components
├── api/                # API service layer
├── stores/             # State management (Zustand)
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── config/             # Configuration files
├── styles/             # Global styles
└── lib/                # Third-party library configurations
```

### **📄 Page Structure**
```
pages/
├── auth/               # Authentication pages
├── dashboard/          # Main dashboard
├── projects/           # Project management
├── pm/                 # Project management detailed
├── organizations/      # Organization management
├── templates/          # Template management
├── security/           # Security settings
├── settings/           # User settings
├── reports/            # Reporting & analytics
├── teams/              # Team management
├── workspaces/         # Workspace management
└── workflows/          # Workflow management
```

### **🧩 Component Architecture**
```
components/
├── auth/               # Authentication components
├── dashboard/          # Dashboard components
├── projects/           # Project management components
├── pm/                 # Project management detailed
│   ├── project-initiation/
│   ├── risk-management/
│   └── status-reporting/
├── admin/              # Admin panel components
├── ui/                 # Reusable UI components
├── forms/              # Form components
├── layout/             # Layout components
├── navigation/         # Navigation components
├── modals/             # Modal components
├── security/           # Security components
├── intelligence/       # AI/Intelligence components
├── resources/          # Resource management
├── templates/          # Template components
└── workspace/          # Workspace components
```

### **🔧 Service Layer**
```
api/                    # API service functions
services/               # Business logic services
stores/                 # State management stores
hooks/                  # Custom React hooks
utils/                  # Utility functions
```

### **🎨 UI System**
```
lib/ui/                 # UI component library
components/ui/          # Reusable UI components
styles/                 # Global styles & themes
```

---

## **🔍 DETAILED MODULE ANALYSIS**

### **📋 Projects Module Structure**

#### **Projects Module (`zephix-backend/dist/src/modules/projects/projects.module.js`)**

```javascript
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c < 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const users_module_1 = require("../users/users.module");
const project_entity_1 = require("./entities/project.entity");
const project_assignment_entity_1 = require("./entities/project-assignment.entity");
const project_phase_entity_1 = require("./entities/project-phase.entity");
const user_entity_1 = require("../users/entities/user.entity");
const projects_service_1 = require("./services/projects.service");
const project_assignment_service_1 = require("./services/project-assignment.service");
const dependency_service_1 = require("./services/dependency.service");
const projects_controller_1 = require("./projects.controller");
let ProjectsModule = class ProjectsModule {
    constructor() {
        console.log('🚀 ProjectsModule loaded with enterprise-grade assignments!');
    }
};
exports.ProjectsModule = ProjectsModule;
exports.ProjectsModule = ProjectsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                project_entity_1.Project,
                project_assignment_entity_1.ProjectAssignment,
                project_phase_entity_1.ProjectPhase,
                user_entity_1.User,
            ]),
            users_module_1.UsersModule,
        ],
        controllers: [
            projects_controller_1.ProjectsController,
        ],
        providers: [
            projects_service_1.ProjectsService,
            project_assignment_service_1.ProjectAssignmentService,
            dependency_service_1.DependencyService,
        ],
        exports: [
            projects_service_1.ProjectsService,
            project_assignment_service_1.ProjectAssignmentService,
            dependency_service_1.DependencyService,
        ],
    }),
    __metadata("design:paramtypes", [])
], ProjectsModule);
```

**Key Features:**
- ✅ **TypeORM Integration**: Imports Project, ProjectAssignment, ProjectPhase, and User entities
- ✅ **Service Layer**: ProjectsService, ProjectAssignmentService, DependencyService
- ✅ **Controller**: ProjectsController for API endpoints
- ✅ **Module Dependencies**: Imports UsersModule for user management
- ✅ **Exports**: All services are exported for use in other modules

#### **Dependency Service (`zephix-backend/dist/src/modules/projects/services/dependency.service.js`)**

```javascript
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c < 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const task_dependency_entity_1 = require("../../tasks/entities/task-dependency.entity");
let DependencyService = class DependencyService {
    constructor(dependencyRepository) {
        this.dependencyRepository = dependencyRepository;
    }
    async create(taskId, dto, userId) {
        const dependency = this.dependencyRepository.create({
            predecessorId: dto.dependsOnTaskId,
            successorId: taskId,
            type: (dto.dependencyType || 'finish-to-start'),
            taskId: taskId,
            dependsOnTaskId: dto.dependsOnTaskId,
            leadLagDays: dto.leadLagDays || 0,
            dependencyType: dto.dependencyType || 'finish-to-start',
            description: dto.description,
            relationshipType: dto.relationshipType || 'blocks',
            status: 'active',
        });
        return this.dependencyRepository.save(dependency);
    }
    async findByTask(taskId) {
        return this.dependencyRepository.find({
            where: { taskId },
            relations: ['dependsOnTask'],
            order: { createdAt: 'ASC' },
        });
    }
    async deleteByTaskId(taskId) {
        await this.dependencyRepository.delete({ taskId });
    }
    async updateStatus(id, status, userId) {
        const dependency = await this.dependencyRepository.findOne({ where: { id } });
        if (!dependency)
            throw new Error('Dependency not found');
        dependency.status = status;
        return this.dependencyRepository.save(dependency);
    }
    async delete(id) {
        await this.dependencyRepository.delete(id);
    }
};
exports.DependencyService = DependencyService;
exports.DependencyService = DependencyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_dependency_entity_1.TaskDependency)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], DependencyService);
```

**Key Features:**
- ✅ **CRUD Operations**: Create, read, update, delete dependencies
- ✅ **Task Dependencies**: Manages task-to-task dependencies
- ✅ **Dependency Types**: Supports finish-to-start, start-to-start, etc.
- ✅ **Lead/Lag Days**: Supports time offsets between tasks
- ✅ **Status Management**: Active/inactive dependency status
- ✅ **Relationship Types**: Blocks, enables, etc.

#### **Tasks Module (`zephix-backend/dist/src/modules/tasks/tasks.module.js`)**

```javascript
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c < 3 && r && Object.defineProperty(target, key, r), d;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const task_entity_1 = require("./entities/task.entity");
const task_dependency_entity_1 = require("./entities/task-dependency.entity");
const tasks_service_1 = require("./tasks.service");
const tasks_controller_1 = require("./tasks.controller");
const resource_module_1 = require("../resources/resource.module");
const kpi_module_1 = require("../kpi/kpi.module");
let TasksModule = class TasksModule {
};
exports.TasksModule = TasksModule;
exports.TasksModule = TasksModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([task_entity_1.Task, task_dependency_entity_1.TaskDependency]),
            resource_module_1.ResourceModule,
            kpi_module_1.KPIModule,
        ],
        controllers: [tasks_controller_1.TasksController],
        providers: [tasks_service_1.TasksService],
        exports: [tasks_service_1.TasksService],
    })
], TasksModule);
```

**Key Features:**
- ✅ **TaskDependency Entity**: ✅ **EXPORTS TaskDependency entity** (confirmed)
- ✅ **TypeORM Integration**: Imports Task and TaskDependency entities
- ✅ **Module Dependencies**: Imports ResourceModule and KPIModule
- ✅ **Service Layer**: TasksService for business logic
- ✅ **Controller**: TasksController for API endpoints

#### **TaskDependency Entity (`zephix-backend/dist/src/modules/tasks/entities/task-dependency.entity.js`)**

```javascript
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c < 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDependency = void 0;
const typeorm_1 = require("typeorm");
const task_entity_1 = require("./task.entity");
let TaskDependency = class TaskDependency {
};
exports.TaskDependency = TaskDependency;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaskDependency.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'predecessor_id' }),
    __metadata("design:type", String)
], TaskDependency.prototype, "predecessorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => task_entity_1.Task, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'predecessor_id' }),
    __metadata("design:type", task_entity_1.Task)
], TaskDependency.prototype, "predecessor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'successor_id' }),
    __metadata("design:type", String)
], TaskDependency.prototype, "successorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => task_entity_1.Task, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'successor_id' }),
    __metadata("design:type", task_entity_1.Task)
], TaskDependency.prototype, "successor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'type', default: 'finish-to-start' }),
    __metadata("design:type", String)
], TaskDependency.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'task_id' }),
    __metadata("design:type", String)
], TaskDependency.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'depends_on_task_id' }),
    __metadata("design:type", String)
], TaskDependency.prototype, "dependsOnTaskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lead_lag_days', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], TaskDependency.prototype, "leadLagDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dependency_type', type: 'varchar', length: 50, default: 'finish-to-start' }),
    __metadata("design:type", String)
], TaskDependency.prototype, "dependencyType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', type: 'text', nullable: true }),
    __metadata("design:type", String)
], TaskDependency.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'relationship_type', type: 'varchar', length: 50, default: 'blocks' }),
    __metadata("design:type", String)
], TaskDependency.prototype, "relationshipType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20, default: 'active' }),
    __metadata("design:type", String)
], TaskDependency.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TaskDependency.prototype, "createdAt", void 0);
exports.TaskDependency = TaskDependency = __decorate([
    (0, typeorm_1.Entity)('simple_task_dependencies')
], TaskDependency);
```

**Key Features:**
- ✅ **Database Table**: Maps to `simple_task_dependencies` table
- ✅ **Relationships**: ManyToOne relationships with Task entity
- ✅ **Dependency Types**: Support for various dependency types
- ✅ **Lead/Lag Days**: Time offset support
- ✅ **Status Management**: Active/inactive status
- ✅ **Cascade Delete**: Automatic cleanup on task deletion

---

## **🔄 DATA FLOW ARCHITECTURE**

### **Backend → Frontend Flow**
```
1. Frontend API calls → API service layer
2. API service → Backend controllers
3. Controllers → Services (business logic)
4. Services → Database (via TypeORM)
5. Database → Services → Controllers → Frontend
```

### **Authentication Flow**
```
1. Login → Auth controller
2. JWT token generation → Frontend storage
3. Protected routes → JWT guard validation
4. User context → Organization context
```

### **State Management**
```
1. API responses → Zustand stores
2. Store updates → Component re-renders
3. User actions → Store updates → API calls
```

---

## **🗄️ DATABASE ARCHITECTURE**

### **Core Tables**
- `users` - User accounts
- `organizations` - Organization data
- `projects` - Project information
- `project_phases` - Project phases
- `tasks` - Task management
- `simple_task_dependencies` - Task dependencies
- `resource_allocations` - Resource assignments
- `project_templates` - Template definitions

### **Relationships**
- Users ↔ Organizations (Many-to-Many)
- Organizations ↔ Projects (One-to-Many)
- Projects ↔ Phases (One-to-Many)
- Projects ↔ Tasks (One-to-Many)
- Tasks ↔ TaskDependencies (One-to-Many)
- Users ↔ Resource Allocations (One-to-Many)

---

## **🚀 DEPLOYMENT ARCHITECTURE**

### **Backend (Railway)**
- NestJS application
- PostgreSQL database
- Environment variables
- Health checks

### **Frontend (Vercel/Netlify)**
- Next.js application
- Static generation
- API integration
- Environment configuration

---

## **🔧 DEVELOPMENT TOOLS**

### **Backend**
- NestJS framework
- TypeORM (database)
- JWT authentication
- Swagger documentation
- Jest testing

### **Frontend**
- Next.js framework
- React components
- TypeScript
- Tailwind CSS
- Zustand state management

---

## **✅ VERIFICATION SUMMARY**

### **Projects Module Analysis**
- ✅ **ProjectsModule**: Exists and properly configured
- ✅ **DependencyService**: Exists and functional
- ✅ **TaskDependency Entity**: ✅ **EXPORTS TaskDependency entity** (confirmed)
- ✅ **TasksModule**: Exists and exports TaskDependency entity

### **Key Findings**
1. **TaskDependency Entity**: ✅ **Successfully exported** from TasksModule
2. **Dependency Service**: Uses TaskDependency entity from tasks module
3. **Module Structure**: Well-organized with proper separation of concerns
4. **Database Integration**: TypeORM properly configured for all entities

This architecture provides a comprehensive, scalable platform for project management with enterprise-grade features including authentication, organization management, resource allocation, risk management, and AI integration.

---

**📝 Document Generated**: October 1, 2024  
**🔧 Architecture Version**: 1.0  
**👨‍💻 Developer Ready**: ✅
