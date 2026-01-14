import { ApiProperty } from '@nestjs/swagger';

export class ProgramBasicDto {
  @ApiProperty({ description: 'Program ID' })
  id: string;

  @ApiProperty({ description: 'Program name' })
  name: string;

  @ApiProperty({ description: 'Program status', enum: ['active', 'archived'] })
  status: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId: string;

  @ApiProperty({ description: 'Portfolio ID', nullable: true })
  portfolioId: string | null;
}

export class ProjectSummaryDto {
  @ApiProperty({ description: 'Project ID' })
  id: string;

  @ApiProperty({ description: 'Project name' })
  name: string;

  @ApiProperty({ description: 'Project status' })
  status: string;

  @ApiProperty({ description: 'Start date', nullable: true })
  startDate: string | null;

  @ApiProperty({ description: 'End date', nullable: true })
  endDate: string | null;

  @ApiProperty({ description: 'Health status', nullable: true })
  healthStatus?: string | null;
}

export class TotalsDto {
  @ApiProperty({ description: 'Total projects' })
  projectsTotal: number;

  @ApiProperty({ description: 'Active projects' })
  projectsActive: number;

  @ApiProperty({ description: 'At risk projects' })
  projectsAtRisk: number;

  @ApiProperty({ description: 'Open work items' })
  workItemsOpen: number;

  @ApiProperty({ description: 'Overdue work items' })
  workItemsOverdue: number;

  @ApiProperty({ description: 'Open resource conflicts' })
  resourceConflictsOpen: number;

  @ApiProperty({ description: 'Active risks' })
  risksActive: number;
}

export class HealthDto {
  @ApiProperty({
    description: 'Health status',
    enum: ['green', 'yellow', 'red'],
  })
  status: 'green' | 'yellow' | 'red';

  @ApiProperty({ description: 'Health reasons', type: [String] })
  reasons: string[];

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: string;
}

export class ProgramRollupResponseDto {
  @ApiProperty({ description: 'API version', example: 1 })
  version: number;

  @ApiProperty({ description: 'Program basic info', type: ProgramBasicDto })
  program: ProgramBasicDto;

  @ApiProperty({ description: 'Rollup totals', type: TotalsDto })
  totals: TotalsDto;

  @ApiProperty({ description: 'Health status', type: HealthDto })
  health: HealthDto;

  @ApiProperty({
    description: 'Projects in program',
    type: [ProjectSummaryDto],
  })
  projects: ProjectSummaryDto[];
}
