import { IsOptional, IsUUID, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TimelineQueryDto {
  @ApiPropertyOptional({
    description: 'Project ID to get timeline for',
    example: 'f1f1b5b5-3b2e-44e6-9420-e1e02c4c0e40'
  })
  @IsUUID(4, { message: 'Project ID must be a valid UUID' })
  projectId: string;

  @ApiPropertyOptional({
    description: 'Include resource utilization data',
    default: true
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeResourceData?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include task dependencies',
    default: true
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDependencies?: boolean = true;

  @ApiPropertyOptional({
    description: 'Filter by task status',
    enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled']
  })
  @IsOptional()
  @IsIn(['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned user ID'
  })
  @IsOptional()
  @IsUUID(4, { message: 'Assigned user ID must be a valid UUID' })
  assignedTo?: string;
}
