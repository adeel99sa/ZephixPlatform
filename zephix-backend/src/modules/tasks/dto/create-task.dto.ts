import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray, IsUUID, Min, Max } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'review', 'done'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  dependencies?: string[];

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @IsOptional()
  @IsString()
  taskNumber?: string;

  @IsOptional()
  @IsString()
  assignedResources?: string;

  @IsOptional()
  @IsNumber()
  resourceImpactScore?: number;

  @IsOptional()
  @IsDateString()
  endDate?: Date;
}
