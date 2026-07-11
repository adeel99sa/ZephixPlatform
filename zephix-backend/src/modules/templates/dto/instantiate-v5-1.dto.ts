import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InstantiateV51Dto {
  @ApiProperty({
    description: 'Project name (required if projectId not provided)',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectName?: string;

  /**
   * TC-B7 (D3): project start date (YYYY-MM-DD), the anchor for relative task
   * Gantt dates (task.startDate = anchor + startOffsetDays). Absent → today.
   */
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'Existing project ID to instantiate into (must be DRAFT)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
