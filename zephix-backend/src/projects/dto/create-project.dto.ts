import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, ProjectPriority } from '../entities/project.entity';

export class CreateProjectDto {
  @ApiProperty({ example: 'Zephix Platform Development' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'Building an AI-driven project management platform',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, example: ProjectStatus.PLANNING })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: ProjectPriority, example: ProjectPriority.HIGH })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 500000.0 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ example: 'Business Requirements Document content...' })
  @IsOptional()
  @IsString()
  businessRequirementsDocument?: string;
}
