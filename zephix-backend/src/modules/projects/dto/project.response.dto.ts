import { Expose, Transform } from 'class-transformer';

export class ProjectResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.name)
  name: string;

  @Expose({ name: 'workspace_id' })
  @Transform(({ obj }) => obj.workspace_id ?? null)
  workspaceId: string | null;

  @Expose({ name: 'organization_id' })
  @Transform(({ obj }) => obj.organization_id)
  organizationId: string;

  @Expose({ name: 'deleted_at' })
  @Transform(({ obj }) => obj.deleted_at)
  deletedAt: string | null;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.created_at)
  createdAt: string;

  @Expose({ name: 'updated_at' })
  @Transform(({ obj }) => obj.updated_at)
  updatedAt: string;
}

/**
 * Stable DTO for project detail responses. Always includes methodologyConfig.
 * Protects frontend from disappearing fields if select optimizations are added.
 */
export class ProjectDetailResponseDto {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  methodology: string;
  workspaceId: string;
  organizationId: string;
  startDate: Date | null;
  endDate: Date | null;
  estimatedEndDate: Date | null;
  riskLevel: string;
  budget: number | null;
  actualCost: number | null;
  currency: string | null;
  costTrackingEnabled: boolean;
  iterationsEnabled: boolean;
  baselinesEnabled: boolean;
  earnedValueEnabled: boolean;
  capacityEnabled: boolean;
  changeManagementEnabled: boolean;
  waterfallEnabled: boolean;
  estimationMode: string | null;
  defaultIterationLengthDays: number | null;
  definitionOfDone: string[] | null;
  methodologyConfig: Record<string, any> | null;
  templateId: string | null;
  governanceSource: string | null;
  health: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(project: Record<string, any>): ProjectDetailResponseDto {
    const dto = new ProjectDetailResponseDto();
    dto.id = project.id;
    dto.name = project.name;
    dto.description = project.description ?? null;
    dto.status = project.status;
    dto.priority = project.priority;
    dto.methodology = project.methodology;
    dto.workspaceId = project.workspaceId;
    dto.organizationId = project.organizationId;
    dto.startDate = project.startDate ?? null;
    dto.endDate = project.endDate ?? null;
    dto.estimatedEndDate = project.estimatedEndDate ?? null;
    dto.riskLevel = project.riskLevel;
    dto.budget = project.budget ?? null;
    dto.actualCost = project.actualCost ?? null;
    dto.currency = project.currency ?? null;
    dto.costTrackingEnabled = project.costTrackingEnabled ?? false;
    dto.iterationsEnabled = project.iterationsEnabled ?? false;
    dto.baselinesEnabled = project.baselinesEnabled ?? false;
    dto.earnedValueEnabled = project.earnedValueEnabled ?? false;
    dto.capacityEnabled = project.capacityEnabled ?? false;
    dto.changeManagementEnabled = project.changeManagementEnabled ?? false;
    dto.waterfallEnabled = project.waterfallEnabled ?? false;
    dto.estimationMode = project.estimationMode ?? null;
    dto.defaultIterationLengthDays = project.defaultIterationLengthDays ?? null;
    dto.definitionOfDone = project.definitionOfDone ?? null;
    dto.methodologyConfig = project.methodologyConfig ?? null;
    dto.templateId = project.templateId ?? null;
    dto.governanceSource = project.governanceSource ?? null;
    dto.health = project.health ?? null;
    dto.createdAt = project.createdAt;
    dto.updatedAt = project.updatedAt;
    return dto;
  }
}
