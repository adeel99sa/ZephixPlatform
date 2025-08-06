import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsEnum, IsOptional, IsDate, IsNumber, IsBoolean } from 'class-validator';
import { ProjectStatus, ProjectPriority } from '../entities/project.entity';

/**
 * Project Response DTO
 * 
 * Comprehensive response object for project data including all essential fields
 * with proper validation and API documentation.
 * 
 * @author Zephix Development Team
 * @version 1.0.0
 */
export class ProjectResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the project',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Name of the project',
    example: 'Zephix Platform MVP',
    type: 'string',
    maxLength: 255,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Detailed description of the project',
    example: 'Core platform development for project management and team collaboration',
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Current status of the project',
    enum: ProjectStatus,
    example: ProjectStatus.ACTIVE,
  })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @ApiProperty({
    description: 'Priority level of the project',
    enum: ProjectPriority,
    example: ProjectPriority.HIGH,
  })
  @IsEnum(ProjectPriority)
  priority: ProjectPriority;

  @ApiProperty({
    description: 'Project start date',
    example: '2024-01-15T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @ApiProperty({
    description: 'Project end date',
    example: '2024-06-30T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @ApiProperty({
    description: 'Project budget in decimal format',
    example: 50000.00,
    type: 'number',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({
    description: 'Business requirements document content',
    example: 'Comprehensive BRD for Zephix Platform MVP...',
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsString()
  businessRequirementsDocument?: string;

  @ApiProperty({
    description: 'ID of the user who created the project',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: 'string',
  })
  @IsUUID()
  createdById: string;

  @ApiProperty({
    description: 'Date when the project was created',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the project was last updated',
    example: '2024-01-20T14:45:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @IsDate()
  updatedAt: Date;
}

/**
 * Projects List Response DTO
 * 
 * Response object for the GET /api/projects endpoint
 * containing an array of projects with metadata.
 * 
 * @author Zephix Development Team
 * @version 1.0.0
 */
export class ProjectsListResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Projects retrieved successfully',
    type: 'string',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Array of projects for the authenticated user',
    type: [ProjectResponseDto],
  })
  projects: ProjectResponseDto[];

  @ApiProperty({
    description: 'Total number of projects returned',
    example: 5,
    type: 'number',
  })
  @IsNumber()
  count: number;
}

/**
 * Single Project Response DTO
 * 
 * Response object for the GET /api/projects/:id endpoint
 * containing a single project with detailed information.
 * 
 * @author Zephix Development Team
 * @version 1.0.0
 */
export class SingleProjectResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Project retrieved successfully',
    type: 'string',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Project details',
    type: ProjectResponseDto,
  })
  project: ProjectResponseDto;
}

/**
 * Project Creation Response DTO
 * 
 * Response object for the POST /api/projects endpoint
 * confirming successful project creation.
 * 
 * @author Zephix Development Team
 * @version 1.0.0
 */
export class ProjectCreationResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Project created successfully',
    type: 'string',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Created project details',
    type: ProjectResponseDto,
  })
  project: ProjectResponseDto;
}

/**
 * Project Update Response DTO
 * 
 * Response object for the PATCH /api/projects/:id endpoint
 * confirming successful project update.
 * 
 * @author Zephix Development Team
 * @version 1.0.0
 */
export class ProjectUpdateResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Project updated successfully',
    type: 'string',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Updated project details',
    type: ProjectResponseDto,
  })
  project: ProjectResponseDto;
}

/**
 * Project Deletion Response DTO
 * 
 * Response object for the DELETE /api/projects/:id endpoint
 * confirming successful project deletion.
 * 
 * @author Zephix Development Team
 * @version 1.0.0
 */
export class ProjectDeletionResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Project deleted successfully',
    type: 'string',
  })
  @IsString()
  message: string;
} 