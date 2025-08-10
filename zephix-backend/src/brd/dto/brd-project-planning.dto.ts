import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsArray, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { ProjectMethodology } from '../entities/generated-project-plan.entity';

export class RefinePlanDto {
  @ApiProperty({
    description: 'Request for plan refinement',
    example: 'Please add more detail to the risk mitigation strategies and include additional stakeholder communication plan'
  })
  @IsString()
  refinementRequest: string;
}

export class CreateProjectFromPlanDto {
  @ApiProperty({
    description: 'Name for the new project',
    example: 'E-commerce Platform Implementation'
  })
  @IsString()
  projectName: string;

  @ApiProperty({
    description: 'Description of the project',
    example: 'Implementation of the e-commerce platform based on the generated project plan'
  })
  @IsString()
  projectDescription: string;

  @ApiProperty({
    description: 'Start date for the project',
    example: '2024-02-01'
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Expected end date for the project',
    example: '2024-08-01'
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Budget allocation for the project',
    example: 500000
  })
  @IsNumber()
  budget: number;

  @ApiProperty({
    description: 'Additional project metadata',
    additionalProperties: true,
    required: false
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ProjectPlanRefinementResponseDto {
  @ApiProperty({
    description: 'ID of the refined plan',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Original plan ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  originalPlanId: string;

  @ApiProperty({
    description: 'Refinement request that was applied',
    example: 'Please add more detail to the risk mitigation strategies'
  })
  refinementRequest: string;

  @ApiProperty({
    description: 'Refined plan structure',
    additionalProperties: true
  })
  refinedPlanStructure: any;

  @ApiProperty({
    description: 'Changes made during refinement',
    type: 'array'
  })
  changesMade: string[];

  @ApiProperty({
    description: 'When the refinement was created',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date;
}

export class ProjectCreationResponseDto {
  @ApiProperty({
    description: 'ID of the created project',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  projectId: string;

  @ApiProperty({
    description: 'Name of the created project',
    example: 'E-commerce Platform Implementation'
  })
  projectName: string;

  @ApiProperty({
    description: 'Status of project creation',
    example: 'success'
  })
  status: string;

  @ApiProperty({
    description: 'Message about the project creation',
    example: 'Project successfully created from plan'
  })
  message: string;

  @ApiProperty({
    description: 'When the project was created',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date;
}
