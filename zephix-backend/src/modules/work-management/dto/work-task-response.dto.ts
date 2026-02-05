import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskPriority, TaskType } from '../enums/task.enums';

/**
 * WorkTaskResponseDto - Standard response shape for work tasks.
 * This is the contract between backend and frontend.
 * Frontend should import a matching type from workTasks.api.ts.
 */
export class WorkTaskResponseDto {
  @ApiProperty({ description: 'Task ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId: string;

  @ApiProperty({ description: 'Project ID' })
  projectId: string;

  @ApiProperty({ description: 'Parent task ID (for subtasks)', nullable: true })
  parentTaskId: string | null;

  @ApiProperty({ description: 'Phase ID', nullable: true })
  phaseId: string | null;

  @ApiProperty({ description: 'Task title' })
  title: string;

  @ApiProperty({ description: 'Task description', nullable: true })
  description: string | null;

  @ApiProperty({ enum: TaskStatus, description: 'Task status' })
  status: TaskStatus;

  @ApiProperty({ enum: TaskType, description: 'Task type' })
  type: TaskType;

  @ApiProperty({ enum: TaskPriority, description: 'Task priority' })
  priority: TaskPriority;

  @ApiProperty({ description: 'Assignee user ID', nullable: true })
  assigneeUserId: string | null;

  @ApiProperty({ description: 'Reporter user ID', nullable: true })
  reporterUserId: string | null;

  @ApiProperty({ description: 'Start date (ISO 8601)', nullable: true })
  startDate: string | null;

  @ApiProperty({ description: 'Due date (ISO 8601)', nullable: true })
  dueDate: string | null;

  @ApiProperty({
    description: 'Completion timestamp (ISO 8601)',
    nullable: true,
  })
  completedAt: string | null;

  @ApiProperty({ description: 'Lexorank for ordering', nullable: true })
  rank: string | null;

  @ApiProperty({ description: 'Tags', type: [String], nullable: true })
  tags: string[] | null;

  @ApiProperty({ description: 'Custom metadata', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ description: 'Created timestamp (ISO 8601)' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp (ISO 8601)' })
  updatedAt: string;
}

/**
 * WorkPlanTaskDto - Lightweight task shape for plan view.
 */
export class WorkPlanTaskDto {
  @ApiProperty({ description: 'Task ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'Task title' })
  title: string;

  @ApiProperty({ enum: TaskStatus, description: 'Task status' })
  status: TaskStatus;

  @ApiProperty({ description: 'Owner/assignee user ID', nullable: true })
  ownerId: string | null;

  @ApiProperty({ description: 'Due date (ISO 8601)', nullable: true })
  dueDate: string | null;
}

/**
 * WorkPhaseResponseDto - Standard response shape for work phases.
 */
export class WorkPhaseResponseDto {
  @ApiProperty({ description: 'Phase ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'Phase name' })
  name: string;

  @ApiProperty({ description: 'Sort order' })
  sortOrder: number;

  @ApiProperty({ description: 'Reporting key' })
  reportingKey: string;

  @ApiProperty({ description: 'Is milestone phase' })
  isMilestone: boolean;

  @ApiProperty({ description: 'Is structure locked' })
  isLocked: boolean;

  @ApiProperty({ description: 'Due date (ISO 8601)', nullable: true })
  dueDate: string | null;

  @ApiProperty({ description: 'Tasks in this phase', type: [WorkPlanTaskDto] })
  tasks: WorkPlanTaskDto[];
}

/**
 * ProjectPlanResponseDto - Response shape for GET /work/projects/:id/plan
 */
export class ProjectPlanResponseDto {
  @ApiProperty({ description: 'Project ID (UUID)' })
  projectId: string;

  @ApiProperty({ description: 'Project name' })
  projectName: string;

  @ApiProperty({ description: 'Project state (DRAFT, ACTIVE, etc.)' })
  projectState: string;

  @ApiProperty({ description: 'Whether project structure is locked' })
  structureLocked: boolean;

  @ApiProperty({
    description: 'Phases with tasks',
    type: [WorkPhaseResponseDto],
  })
  phases: WorkPhaseResponseDto[];
}

/**
 * ListTasksResponseDto - Response shape for GET /work/tasks
 */
export class ListTasksResponseDto {
  @ApiProperty({ description: 'Task items', type: [WorkTaskResponseDto] })
  items: WorkTaskResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;
}
