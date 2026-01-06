import {
  ProjectStatus,
  ProjectPriority,
  ProjectRiskLevel,
} from '../entities/project.entity';

/**
 * Phase 7: Project summary response DTO
 * Includes counts and summary data for project overview
 */
export class ProjectSummaryDto {
  id: string;
  name: string;
  workspaceId: string;
  methodology: string;
  status: ProjectStatus;
  ownerId?: string; // Using projectManagerId as ownerId
  phasesCount: number;
  tasksCount: number;
  risksCount: number;
  kpisCount: number;
  startDate?: Date;
  endDate?: Date;
  estimatedEndDate?: Date;
  progress: number; // 0-100
  riskScore: number; // 0-100
  priority: ProjectPriority;
  riskLevel: ProjectRiskLevel;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

