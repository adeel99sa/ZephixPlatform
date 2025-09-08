import { IsString, IsOptional, IsUUID, IsNumber, IsDateString, IsEnum, IsBoolean, IsArray, ValidateIf } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @IsOptional()
  @IsEnum(['task', 'milestone', 'deliverable'])
  taskType?: 'task' | 'milestone' | 'deliverable';

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(['internal', 'vendor'])
  assignmentType?: 'internal' | 'vendor';

  @IsString()
  @IsOptional()
  @ValidateIf(o => o.assignmentType === 'vendor')
  vendorName?: string;

  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @IsOptional()
  @IsBoolean()
  isMilestone?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  dependsOn?: string[]; // Task IDs this task depends on

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  dependencies?: string[]; // Text-based dependencies
}

export class UpdateTaskDto extends CreateTaskDto {
  @IsOptional()
  @IsEnum(['not_started', 'in_progress', 'completed', 'cancelled', 'blocked', 'on_hold'])
  status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' | 'on_hold';

  @IsOptional()
  @IsNumber()
  progressPercentage?: number;

  @IsOptional()
  @IsNumber()
  actualHours?: number;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsString()
  blockedReason?: string;
}
