import { ApiProperty } from '@nestjs/swagger';

export class PortfolioBasicDto {
  @ApiProperty({ description: 'Portfolio ID' })
  id: string;

  @ApiProperty({ description: 'Portfolio name' })
  name: string;

  @ApiProperty({
    description: 'Portfolio status',
    enum: ['active', 'archived'],
  })
  status: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId: string;
}

export class ProgramSummaryDto {
  @ApiProperty({ description: 'Program ID' })
  id: string;

  @ApiProperty({ description: 'Program name' })
  name: string;

  @ApiProperty({ description: 'Program status' })
  status: string;

  @ApiProperty({ description: 'Total projects in program' })
  projectsTotal: number;

  @ApiProperty({ description: 'At risk projects in program' })
  projectsAtRisk: number;

  @ApiProperty({ description: 'Health status', nullable: true })
  healthStatus?: string | null;
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
  @ApiProperty({ description: 'Total programs' })
  programsTotal: number;

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

export class PortfolioRollupResponseDto {
  @ApiProperty({ description: 'API version', example: 1 })
  version: number;

  @ApiProperty({ description: 'Portfolio basic info', type: PortfolioBasicDto })
  portfolio: PortfolioBasicDto;

  @ApiProperty({ description: 'Rollup totals', type: TotalsDto })
  totals: TotalsDto;

  @ApiProperty({ description: 'Health status', type: HealthDto })
  health: HealthDto;

  @ApiProperty({
    description: 'Programs in portfolio',
    type: [ProgramSummaryDto],
  })
  programs: ProgramSummaryDto[];

  @ApiProperty({
    description: 'Direct portfolio projects (not via program)',
    type: [ProjectSummaryDto],
  })
  projectsDirect: ProjectSummaryDto[];
}
