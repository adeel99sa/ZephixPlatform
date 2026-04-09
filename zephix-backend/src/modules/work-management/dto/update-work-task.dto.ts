import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  TaskStatus,
  TaskPriority,
  WorkTaskApprovalStatus,
} from '../enums/task.enums';

export class UpdateWorkTaskDto {
  @ApiProperty({ description: 'Task title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Task description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Task status',
    enum: TaskStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    description: 'Task priority',
    enum: TaskPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ description: 'Assignee user ID', required: false })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @ApiProperty({ description: 'Parent task ID for subtask relationship', required: false })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string | null;

  /**
   * Phase 9 (2026-04-08) — Move task to a different phase.
   *
   * Set to a phase id to relocate the task; the service validates that
   * the target phase belongs to the same project and is not soft-deleted.
   * Subtasks of the moved task are NOT automatically reparented to the
   * new phase — they keep their existing parentTaskId, so the
   * hierarchy stays intact while the top-level grouping changes.
   *
   * Setting `null` is intentionally not supported via this DTO yet —
   * tasks must always belong to some phase in the Waterfall surface.
   * The legacy "unassigned" pseudo-phase is read-only.
   */
  @ApiProperty({
    description:
      'Move the task to a different phase in the same project. Phase must exist, belong to the same project, and not be soft-deleted.',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @ApiProperty({ description: 'Start date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Due date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Estimate in story points', required: false })
  @IsOptional()
  @IsNumber()
  estimatePoints?: number | null;

  @ApiProperty({ description: 'Estimate in hours', required: false })
  @IsOptional()
  @IsNumber()
  estimateHours?: number | null;

  @ApiProperty({ description: 'Remaining hours', required: false })
  @IsOptional()
  @IsNumber()
  remainingHours?: number | null;

  @ApiProperty({ description: 'Actual hours spent', required: false })
  @IsOptional()
  @IsNumber()
  actualHours?: number | null;

  @ApiProperty({ description: 'Iteration ID', required: false })
  @IsOptional()
  @IsUUID()
  iterationId?: string | null;

  @ApiProperty({ description: 'Committed to iteration', required: false })
  @IsOptional()
  @IsBoolean()
  committed?: boolean;

  @ApiProperty({ description: 'Tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Archived flag', required: false })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @ApiProperty({
    description: 'Acceptance criteria items',
    required: false,
    type: 'array',
    items: { type: 'object', properties: { text: { type: 'string' }, done: { type: 'boolean' } } },
  })
  @IsOptional()
  @IsArray()
  acceptanceCriteria?: Array<{ text: string; done: boolean }>;

  @ApiProperty({ description: 'Board rank for ordering within column', required: false })
  @IsOptional()
  @IsNumber()
  rank?: number;

  @ApiProperty({
    description: 'Override WIP limit (admin only)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  wipOverride?: boolean;

  @ApiProperty({
    description: 'Reason for WIP override',
    required: false,
  })
  @IsOptional()
  @IsString()
  wipOverrideReason?: string;

  // ── Phase 5B.1: Waterfall row-level fields ───────────────────────────
  @ApiProperty({
    description:
      'Row-level approval status (Waterfall). not_required is the default; required means approval is needed but not yet submitted.',
    enum: WorkTaskApprovalStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(WorkTaskApprovalStatus)
  approvalStatus?: WorkTaskApprovalStatus;

  @ApiProperty({
    description:
      'Whether a supporting document is required to complete this row. Phase 5B.1 only persists the flag; no upload model exists yet.',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  documentRequired?: boolean;

  @ApiProperty({
    description:
      'Free-form remarks for this row. Not a substitute for a document or approval record.',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  remarks?: string | null;

  // ── Phase 5B.1A: Waterfall milestone inline toggle ───────────────────
  // Already a column on `work_tasks` (Phase 2B); 5B.1A exposes it on the
  // update DTO so the WaterfallTable can toggle it inline. Truthful flag —
  // does NOT trigger any approval workflow on its own.
  @ApiProperty({
    description: 'Whether this row is a milestone (Waterfall row signal).',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isMilestone?: boolean;
}
