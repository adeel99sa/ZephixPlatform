# Proof Pack: 4 MVP Blockers

**Date:** January 15, 2026
**Purpose:** Evidence-based code snippets for 4 critical blockers preventing MVP tester workflow

---

## Blocker 1: Task Endpoint Mismatch

### Problem
Frontend calls legacy `/tasks/*` and `/projects/:id/tasks` endpoints, but backend serves `/work/tasks/*`.

### Frontend Evidence

**File:** `zephix-frontend/src/services/taskService.ts`

```5:31:zephix-frontend/src/services/taskService.ts
  async getTasks(projectId: string): Promise<Task[]> {
    const response = await apiClient.get(`/tasks/project/${projectId}`);
    return response.data;
  },

  async getTask(taskId: string): Promise<Task> {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data;
  },

  async createTask(task: CreateTaskInput): Promise<Task> {
    const response = await apiClient.post('/tasks', task);
    return response.data;
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const response = await apiClient.patch(`/tasks/${taskId}`, updates);
    return response.data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}`);
  },

  async updateProgress(taskId: string, progress: number): Promise<Task> {
    const response = await apiClient.patch(`/tasks/${taskId}/progress`, { progress });
    return response.data;
  },
```

**File:** `zephix-frontend/src/components/tasks/TaskList.tsx`

```37:59:zephix-frontend/src/components/tasks/TaskList.tsx
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/projects/${projectId}/tasks`);

      // Handle both interceptor-wrapped and direct responses
      const responseData = response.data?.data || response.data;

      // Ensure we always have an array
      const tasksArray = Array.isArray(responseData) ? responseData :
                        Array.isArray(responseData?.tasks) ? responseData.tasks :
                        Array.isArray(responseData?.data) ? responseData.data : [];

      setTasks(tasksArray);
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      // Don't show error to user, just show empty state
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };
```

**File:** `zephix-frontend/src/pages/projects/ProjectDetailPage.tsx`

```49:71:zephix-frontend/src/pages/projects/ProjectDetailPage.tsx
  const loadTasks = async () => {
    try {
      const response = await api.get(`/projects/${id}/tasks`);
      const responseData = response.data?.data || response.data;
      const tasksArray = Array.isArray(responseData) ? responseData : [];
      setTasks(tasksArray);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      await api.patch(`/tasks/${taskId}`, updates);
      // Refresh tasks list
      await loadTasks();
      // Trigger KPI recalculation
      await api.post(`/kpi/project/${id}/refresh`);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };
```

### Backend Evidence

**File:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts`

```64:127:zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts
@Controller('work/tasks')
@ApiTags('Work Management')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkTasksController {
  constructor(
    private readonly workTasksService: WorkTasksService,
    private readonly taskDependenciesService: TaskDependenciesService,
    private readonly taskCommentsService: TaskCommentsService,
    private readonly taskActivityService: TaskActivityService,
    private readonly responseService: ResponseService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  // 1. GET /api/work/tasks
  @Get()
  @ApiOperation({ summary: 'List work tasks' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'BACKLOG',
      'TODO',
      'IN_PROGRESS',
      'BLOCKED',
      'IN_REVIEW',
      'DONE',
      'CANCELED',
    ],
  })
  @ApiQuery({ name: 'assigneeUserId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  async listTasks(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Query() query: ListWorkTasksQueryDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const result = await this.workTasksService.listTasks(
      auth,
      workspaceId,
      query,
    );
    return this.responseService.success(result);
  }
```

### Failing Request Example

**Expected:** Frontend calls `GET /api/tasks/project/{projectId}` or `GET /api/projects/{projectId}/tasks`
**Actual:** Backend serves `GET /api/work/tasks?projectId={projectId}` with required `x-workspace-id` header
**Result:** 404 Not Found or 403 Forbidden (missing workspace header)

---

## Blocker 2: Missing x-workspace-id Propagation

### Problem
Frontend `api.ts` interceptor does not add `x-workspace-id` header, but backend `/work/tasks` endpoints require it.

### Frontend Evidence

**File:** `zephix-frontend/src/services/api.ts`

```87:135:zephix-frontend/src/services/api.ts
// Request interceptor for token attachment and logging
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from Zustand auth store
    const authStorage = localStorage.getItem('auth-storage');

    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage) as { state: AuthState };

        // Check if we have a valid token that hasn't expired
        const hasValidToken = state?.accessToken &&
                             state.accessToken !== 'null' &&
                             state.accessToken !== null &&
                             typeof state.accessToken === 'string' &&
                             state.accessToken.length > 0 &&
                             state?.expiresAt;

        if (hasValidToken) {
          const now = Date.now();

          if (now < state.expiresAt) {
            config.headers.Authorization = `Bearer ${state.accessToken}`;
          } else {
            // Token expired, remove it
            console.warn('Access token expired, will attempt refresh');
          }
        }
      } catch (error) {
        console.error('Failed to parse auth storage:', error);
        localStorage.removeItem('auth-storage');
      }
    }

    // Development logging
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      if (config.data) {
        console.log('Request payload:', config.data);
      }
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);
```

**Note:** This interceptor adds `Authorization` header but does NOT add `x-workspace-id`.

**File:** `zephix-frontend/src/lib/api/client.ts` (alternative client that DOES add header)

```70:78:zephix-frontend/src/lib/api/client.ts
        // Add organization header (stub for now)
        const orgId = this.getOrganizationId();
        if (orgId) {
          config.headers['x-organization-id'] = orgId;
        }

        // Add workspace context (future-proofing)
        const workspaceId = this.getWorkspaceId();
        config.headers['x-workspace-id'] = workspaceId || 'default';

        return config;
```

**Note:** `client.ts` adds `x-workspace-id`, but `taskService.ts` uses `apiClient` from `auth.interceptor`, not this client.

### Backend Evidence

**File:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts`

```48:62:zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts
function validateWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id is required',
    });
  }
  if (!UUID_REGEX.test(workspaceId)) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id must be a valid UUID',
    });
  }
  return workspaceId;
}
```

**File:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts`

```113:127:zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts
  async listTasks(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Query() query: ListWorkTasksQueryDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const result = await this.workTasksService.listTasks(
      auth,
      workspaceId,
      query,
    );
    return this.responseService.success(result);
  }
```

### Failing Request Example

**Request:** `GET /api/work/tasks?projectId=abc-123` (no `x-workspace-id` header)
**Response:** `403 Forbidden` with `{ code: 'WORKSPACE_REQUIRED', message: 'Workspace header x-workspace-id is required' }`

---

## Blocker 3: My Work Reads WorkItem Not WorkTask

### Problem
My Work service queries `WorkItem` entity, but task execution uses `WorkTask` entity. Users complete tasks but My Work stays empty.

### Backend Evidence

**File:** `zephix-backend/src/modules/work-items/services/my-work.service.ts`

```60:77:zephix-backend/src/modules/work-items/services/my-work.service.ts
    // Build where clause
    const where: any = {
      organizationId,
      assigneeId: userId,
      deletedAt: IsNull(),
    };

    // Scope by accessible workspaces
    if (accessibleWorkspaceIds !== null) {
      where.workspaceId = In(accessibleWorkspaceIds);
    }

    // Get all work items for user
    const workItems = await this.workItemRepository.find({
      where,
      relations: ['project', 'workspace'],
      take: 200, // Default limit
    });
```

**Note:** Line 73 queries `workItemRepository` (WorkItem entity), not `workTaskRepository` (WorkTask entity).

**File:** `zephix-backend/src/modules/work-items/entities/work-item.entity.ts`

```28:101:zephix-backend/src/modules/work-items/entities/work-item.entity.ts
@WorkspaceScoped()
@Entity('work_items')
export class WorkItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({
    type: 'varchar',
    default: WorkItemType.TASK,
  })
  type: WorkItemType;

  @Column({
    type: 'varchar',
    default: WorkItemStatus.TODO,
  })
  status: WorkItemStatus;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId?: string;

  @Column({ type: 'int', nullable: true })
  points?: number;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  // Relations
  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace?: Workspace;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;
}
```

**File:** `zephix-backend/src/modules/work-management/entities/work-task.entity.ts`

```16:50:zephix-backend/src/modules/work-management/entities/work-task.entity.ts
@Entity('work_tasks')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['parentTaskId'])
@Index(['phaseId'])
@Index(['assigneeUserId'])
@Index(['reporterUserId'])
@Index(['rank'])
@Index(['workspaceId', 'phaseId', 'rank'], { where: '"phase_id" IS NOT NULL' })
export class WorkTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'parent_task_id', nullable: true })
  parentTaskId: string | null;

  @Column({ type: 'uuid', name: 'phase_id', nullable: true })
  phaseId: string | null;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
```

**Note:**
- `WorkItem` uses `assigneeId` (line 61-62 in work-item.entity.ts)
- `WorkTask` uses `assigneeUserId` (line 22 index in work-task.entity.ts, field not shown but exists)
- Different tables: `work_items` vs `work_tasks`
- Different status enums: `WorkItemStatus` (todo, in_progress, done) vs `TaskStatus` (BACKLOG, TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, DONE, CANCELED)

### Failing Request Example

**Scenario:**
1. User creates a task via `/work/tasks` → creates `WorkTask` record with `assigneeUserId = user-123`
2. User views My Work → queries `WorkItem` table with `assigneeId = user-123`
3. Result: Empty list (WorkTask records are not in WorkItem table)

**Evidence:** My Work service imports and queries `WorkItem` entity, but task execution creates `WorkTask` records.

---

## Blocker 4: No Project-Level KPI Activation State

### Problem
Templates store `defaultEnabledKPIs` array, but Project entity has no `activeKpiIds` field to track which KPIs are active per project.

### Backend Evidence

**File:** `zephix-backend/src/modules/templates/entities/project-template.entity.ts`

```65:74:zephix-backend/src/modules/templates/entities/project-template.entity.ts
  @Column({ name: 'available_kpis', type: 'jsonb', default: [] })
  availableKPIs: KPIDefinition[]; // All KPIs for this methodology

  @Column({
    name: 'default_enabled_kpis',
    type: 'text',
    array: true,
    default: [],
  })
  defaultEnabledKPIs: string[]; // KPI IDs enabled by default
```

**File:** `zephix-backend/src/modules/projects/entities/project.entity.ts`

```55:254:zephix-backend/src/modules/projects/entities/project.entity.ts
@WorkspaceScoped()
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    type: 'varchar',
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ name: 'estimated_end_date', type: 'timestamp', nullable: true })
  estimatedEndDate: Date;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'project_manager_id', type: 'uuid', nullable: true })
  projectManagerId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({
    name: 'actual_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  actualCost: number;

  @Column({
    name: 'risk_level',
    type: 'varchar',
    default: ProjectRiskLevel.MEDIUM,
  })
  riskLevel: ProjectRiskLevel;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Workspace, { nullable: true })
  @JoinColumn({ name: 'workspace_id' })
  workspace?: Workspace;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdByUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'project_manager_id' })
  projectManager: User;

  // PHASE 6: Portfolio and Program assignment
  // Project can link to portfolio and/or program
  // If programId provided, portfolioId can be derived from program.portfolioId
  // Both must belong to same workspace as project
  @Column({ name: 'portfolio_id', type: 'uuid', nullable: true })
  portfolioId: string;

  @Column({ name: 'program_id', type: 'uuid', nullable: true })
  programId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size: string;

  @Column({ type: 'varchar', length: 50, default: 'agile', nullable: true })
  methodology: string;

  // Missing relations that other entities expect
  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  // @OneToMany(() => ProjectPhase, phase => phase.project)
  // phases: ProjectPhase[];

  // @OneToMany(() => ProjectAssignment, assignment => assignment.project)
  // assignments: ProjectAssignment[];

  @ManyToOne(() => Organization, (organization) => organization.projects)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // PHASE 6: Portfolio and Program relations
  @ManyToOne(() => Portfolio, { nullable: true })
  @JoinColumn({ name: 'portfolio_id' })
  portfolio?: Portfolio;

  @ManyToOne(() => Program, (program) => program.projects, { nullable: true })
  @JoinColumn({ name: 'program_id' })
  program?: Program;

  // Template Center v1 fields
  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string;

  @Column({ name: 'template_version', type: 'integer', nullable: true })
  templateVersion?: number;

  @Column({ name: 'template_locked', type: 'boolean', default: false })
  templateLocked: boolean;

  @Column({ name: 'template_snapshot', type: 'jsonb', nullable: true })
  templateSnapshot?: {
    templateId: string;
    templateVersion: number;
    locked: boolean;
    blocks: Array<{
      blockId: string;
      enabled: boolean;
      displayOrder: number;
      config: any;
      locked: boolean;
    }>;
  };

  // Sprint 2: Work state and structure locking
  @Column({
    type: 'varchar',
    length: 50,
    default: ProjectState.DRAFT,
    nullable: true,
  })
  state: ProjectState;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'structure_locked', type: 'boolean', default: false })
  structureLocked: boolean;

  @Column({ name: 'structure_snapshot', type: 'jsonb', nullable: true })
  structureSnapshot: {
    containerType: 'PROJECT' | 'PROGRAM';
    containerId: string;
    templateId: string | null;
    templateVersion: number | null;
    phases: Array<{
      phaseId: string;
      reportingKey: string;
      name: string;
      sortOrder: number;
    }>;
    lockedAt: string;
    lockedByUserId: string;
  } | null;

  // Sprint 3: Health tracking
  @Column({
    type: 'varchar',
    length: 50,
    default: ProjectHealth.HEALTHY,
    nullable: true,
  })
  health: ProjectHealth;

  @Column({ name: 'behind_target_days', type: 'integer', nullable: true })
  behindTargetDays: number | null;

  @Column({ name: 'health_updated_at', type: 'timestamp', nullable: true })
  healthUpdatedAt: Date | null;

  // Sprint 6: Delivery owner for work management
  @Column({ name: 'delivery_owner_user_id', type: 'uuid', nullable: true })
  deliveryOwnerUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delivery_owner_user_id' })
  deliveryOwner?: User;
}
```

**Note:** Project entity has no `activeKpiIds` field. Template has `defaultEnabledKPIs`, but project cannot store which KPIs are currently active.

### Search Evidence

**Grep Result:** No matches for `activeKpiIds` or `active_kpi_ids` in `zephix-backend/`

### Failing Request Example

**Scenario:**
1. Template has `defaultEnabledKPIs: ['kpi-1', 'kpi-2', 'kpi-3']`
2. Project created from template → no `activeKpiIds` field exists
3. User toggles KPI off → no field to update
4. User refreshes → no state persisted

**Evidence:** No database column or entity field exists to store project-level KPI activation state.

---

## Summary

| Blocker | Frontend File | Backend File | Issue | Impact |
|---------|--------------|--------------|-------|--------|
| 1. Task endpoint mismatch | `taskService.ts:6,11,16,21,26,30` | `work-tasks.controller.ts:64` | Frontend calls `/tasks/*`, backend serves `/work/tasks/*` | **HIGH** - All task operations fail |
| 2. Missing x-workspace-id | `api.ts:88-135` | `work-tasks.controller.ts:48-62,113-127` | Interceptor doesn't add header, backend requires it | **HIGH** - All work management requests return 403 |
| 3. My Work reads WorkItem | N/A (backend only) | `my-work.service.ts:73` | Queries `WorkItem` table, tasks are in `WorkTask` table | **HIGH** - My Work shows empty after task completion |
| 4. No KPI activation state | N/A (backend only) | `project.entity.ts` (missing field) | No `activeKpiIds` field on Project entity | **HIGH** - Cannot toggle KPIs per project |

---

**Next Steps:** Use this proof pack to create file-by-file implementation sequence with acceptance checks.
