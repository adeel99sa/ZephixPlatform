import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  WorkflowTemplate,
  WorkflowStage,
  WorkflowApproval,
  WorkflowVersion,
  WorkflowType,
  WorkflowStatus,
} from '../entities';
import {
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  WorkflowTemplateDto,
  WorkflowTemplateWithRelationsDto,
  CloneTemplateDto,
  CreateWorkflowStageDto,
  CreateWorkflowApprovalDto,
} from '../dto';

@Injectable()
export class WorkflowTemplatesService {
  private readonly logger = new Logger(WorkflowTemplatesService.name);
  private readonly maxTemplatesPerOrg: number;
  private readonly maxStagesPerTemplate: number;

  constructor(
    @InjectRepository(WorkflowTemplate)
    private readonly workflowTemplateRepository: Repository<WorkflowTemplate>,
    @InjectRepository(WorkflowStage)
    private readonly workflowStageRepository: Repository<WorkflowStage>,
    @InjectRepository(WorkflowApproval)
    private readonly workflowApprovalRepository: Repository<WorkflowApproval>,
    @InjectRepository(WorkflowVersion)
    private readonly workflowVersionRepository: Repository<WorkflowVersion>,
    private readonly configService: ConfigService,
  ) {
    this.maxTemplatesPerOrg = this.configService.get<number>(
      'MAX_WORKFLOW_TEMPLATES_PER_ORG',
      100,
    );
    this.maxStagesPerTemplate = this.configService.get<number>(
      'MAX_STAGES_PER_WORKFLOW',
      50,
    );
  }

  async createWorkflowTemplate(
    dto: CreateWorkflowTemplateDto,
    organizationId: string,
    userId: string,
  ): Promise<WorkflowTemplate> {
    try {
      // Check organization template limit
      const existingCount = await this.workflowTemplateRepository.count({
        where: { organizationId, deletedAt: IsNull() },
      });

      if (existingCount >= this.maxTemplatesPerOrg) {
        throw new BadRequestException(
          `Organization has reached the maximum limit of ${this.maxTemplatesPerOrg} workflow templates`,
        );
      }

      // Validate stage count
      if (dto.stages.length > this.maxStagesPerTemplate) {
        throw new BadRequestException(
          `Template cannot have more than ${this.maxStagesPerTemplate} stages`,
        );
      }

      // Create template
      const template = this.workflowTemplateRepository.create({
        name: dto.name,
        description: dto.description,
        type: dto.type,
        organizationId,
        createdBy: userId,
        status: WorkflowStatus.DRAFT,
        isDefault: false,
        version: 1,
        usageCount: 0,
        metadata: dto.metadata || {},
      });

      const savedTemplate =
        await this.workflowTemplateRepository.save(template);

      // Create stages
      const stages = await this.createStages(
        dto.stages,
        savedTemplate.id,
        userId,
      );

      // Create approvals for each stage
      if (dto.approvals) {
        await this.createApprovalsForStages(dto.approvals, stages, userId);
      }

      // Create initial version
      await this.createTemplateVersion(savedTemplate, stages, userId);

      this.logger.log(
        `Workflow template created successfully: ${savedTemplate.id}`,
      );

      return savedTemplate;
    } catch (error) {
      this.logger.error(
        `Failed to create workflow template: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(
    organizationId: string,
    filters: {
      status?: WorkflowStatus;
      type?: WorkflowType;
      isDefault?: boolean;
    } = {},
  ): Promise<WorkflowTemplateDto[]> {
    try {
      const queryBuilder = this.workflowTemplateRepository
        .createQueryBuilder('template')
        .leftJoinAndSelect('template.stages', 'stages')
        .where('template.organizationId = :organizationId', { organizationId })
        .andWhere('template.deletedAt IS NULL');

      if (filters.status) {
        queryBuilder.andWhere('template.status = :status', {
          status: filters.status,
        });
      }

      if (filters.type) {
        queryBuilder.andWhere('template.type = :type', { type: filters.type });
      }

      if (filters.isDefault !== undefined) {
        queryBuilder.andWhere('template.isDefault = :isDefault', {
          isDefault: filters.isDefault,
        });
      }

      const templates = await queryBuilder
        .orderBy('template.createdAt', 'DESC')
        .getMany();

      return templates.map((template) => this.mapToDto(template));
    } catch (error) {
      this.logger.error(
        `Failed to find workflow templates: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve workflow templates',
      );
    }
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<WorkflowTemplateWithRelationsDto> {
    try {
      const template = await this.workflowTemplateRepository.findOne({
        where: { id, organizationId, deletedAt: IsNull() },
        relations: ['stages', 'stages.approvals'],
      });

      if (!template) {
        throw new NotFoundException(
          `Workflow template with ID ${id} not found`,
        );
      }

      return this.mapToDtoWithRelations(template);
    } catch (error) {
      this.logger.error(`Failed to find workflow template ${id}`, error.stack);
      throw error;
    }
  }

  async updateWorkflowTemplate(
    id: string,
    dto: UpdateWorkflowTemplateDto,
    organizationId: string,
    userId: string,
  ): Promise<WorkflowTemplateDto> {
    try {
      const template = await this.findById(id, organizationId);

      // Check if template can be modified
      if (!this.canBeModified(template)) {
        throw new BadRequestException(
          'Template cannot be modified in its current state',
        );
      }

      // Update template
      const updatedTemplate = await this.workflowTemplateRepository.save({
        id,
        ...dto,
        updatedAt: new Date(),
      });

      // Create new version if significant changes
      if (this.hasSignificantChanges(dto)) {
        const templateWithRelations = await this.findById(id, organizationId);
        // Convert DTOs to entities for versioning
        const stageEntities = templateWithRelations.stages.map((stageDto) => ({
          id: stageDto.id,
          workflowTemplateId: id,
          name: stageDto.name,
          description: stageDto.description,
          type: stageDto.type,
          status: stageDto.status,
          order: stageDto.order,
          estimatedDuration: stageDto.estimatedDuration,
          durationUnit: stageDto.durationUnit,
          entryCriteria: stageDto.entryCriteria,
          exitCriteria: stageDto.exitCriteria,
          deliverables: stageDto.deliverables,
          roles: stageDto.roles,
          raciMatrix: stageDto.raciMatrix,
          requiresApproval: stageDto.requiresApproval,
          isMilestone: stageDto.isMilestone,
          dependencies: stageDto.dependencies,
          metadata: stageDto.metadata,
          createdAt: stageDto.createdAt,
          updatedAt: stageDto.updatedAt,
        })) as unknown as WorkflowStage[];

        await this.createTemplateVersion(
          updatedTemplate,
          stageEntities,
          userId,
        );
      }

      this.logger.log(`Workflow template updated successfully: ${id}`);

      return this.mapToDto(updatedTemplate);
    } catch (error) {
      this.logger.error(
        `Failed to update workflow template ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteWorkflowTemplate(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      const template = await this.findById(id, organizationId);

      // Check if template can be deleted
      if (!this.canBeDeleted(template)) {
        throw new BadRequestException(
          'Template cannot be deleted in its current state',
        );
      }

      // Soft delete template and related entities
      await Promise.all([
        this.workflowTemplateRepository.update(id, {
          deletedAt: new Date(),
          status: WorkflowStatus.ARCHIVED,
        }),
        this.workflowStageRepository.update(
          { workflowTemplateId: id },
          { deletedAt: new Date() },
        ),
      ]);

      this.logger.log(`Workflow template deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete workflow template ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async cloneTemplate(
    id: string,
    organizationId: string,
    dto: CloneTemplateDto,
  ): Promise<WorkflowTemplateDto> {
    try {
      const template = await this.findById(id, organizationId);

      const clonedTemplate = this.workflowTemplateRepository.create({
        name: dto.name,
        description: dto.description || `Copy of ${template.name}`,
        type: template.type,
        organizationId,
        status: WorkflowStatus.DRAFT,
        isDefault: false,
        version: 1,
        usageCount: 0,
      });

      const savedClonedTemplate =
        await this.workflowTemplateRepository.save(clonedTemplate);

      this.logger.log(
        `Workflow template cloned successfully: ${savedClonedTemplate.id}`,
      );

      return this.mapToDto(savedClonedTemplate);
    } catch (error) {
      this.logger.error(
        `Failed to clone workflow template ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getDefaultTemplate(
    organizationId: string,
  ): Promise<WorkflowTemplateDto | null> {
    try {
      const defaultTemplate = await this.workflowTemplateRepository.findOne({
        where: {
          organizationId,
          isDefault: true,
          deletedAt: IsNull(),
        },
        relations: ['stages', 'stages.approvals'],
      });

      return defaultTemplate ? this.mapToDto(defaultTemplate) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get default template: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve default template',
      );
    }
  }

  async incrementUsageCount(id: string, organizationId: string): Promise<void> {
    try {
      await this.workflowTemplateRepository.increment(
        { id, organizationId },
        'usageCount',
        1,
      );

      await this.workflowTemplateRepository.update(
        { id, organizationId },
        { lastUsedAt: new Date() },
      );
    } catch (error) {
      this.logger.error(
        `Failed to increment usage count for template ${id}: ${error.message}`,
        error.stack,
      );
      // Don't throw error for usage tracking failures
    }
  }

  // Private helper methods
  private async createStages(
    stageDtos: CreateWorkflowStageDto[],
    templateId: string,
    userId: string,
  ): Promise<WorkflowStage[]> {
    const stages: WorkflowStage[] = [];

    for (const stageDto of stageDtos) {
      // Convert DTO structure to entity structure
      const stageData = {
        ...stageDto,
        workflowTemplateId: templateId,
        // Convert roles from string[] to the expected structure
        roles: stageDto.roles
          ? stageDto.roles.map((role) => ({
              role,
              responsibilities: [],
              required: true,
            }))
          : [],
        // Convert raciMatrix to the expected structure
        raciMatrix: stageDto.raciMatrix || {
          responsible: [],
          accountable: [],
          consulted: [],
          informed: [],
        },
      };

      const stage = this.workflowStageRepository.create(stageData);
      const savedStage = await this.workflowStageRepository.save(stage);
      stages.push(savedStage);
    }

    return stages;
  }

  private async createApprovalsForStages(
    approvalDtos: CreateWorkflowApprovalDto[],
    stages: WorkflowStage[],
    userId: string,
  ): Promise<void> {
    // For now, we'll create approvals for the first stage only
    // In a real implementation, you'd want to map approvals to specific stages
    if (stages.length > 0 && approvalDtos.length > 0) {
      const firstStage = stages[0];

      for (const approvalDto of approvalDtos) {
        const approval = this.workflowApprovalRepository.create({
          ...approvalDto,
          workflowStageId: firstStage.id,
          reviewerId: userId, // This should come from the DTO in a real implementation
        });

        await this.workflowApprovalRepository.save(approval);
      }
    }
  }

  private async createTemplateVersion(
    template: WorkflowTemplate,
    stages: WorkflowStage[],
    userId: string,
  ): Promise<WorkflowVersion> {
    const version = this.workflowVersionRepository.create({
      workflowTemplateId: template.id,
      createdBy: userId,
      versionNumber: template.version,
      versionName: `v${template.version}`,
      description: `Auto-generated version ${template.version}`,
      templateData: {
        name: template.name,
        description: template.description,
        type: template.type,
        metadata: template.metadata,
        stages: stages.map((stage) => this.sanitizeForVersioning(stage)),
        approvals: [], // We'll populate this from the stages if needed
      },
      isPublished: false,
    });

    return await this.workflowVersionRepository.save(version);
  }

  private sanitizeForVersioning(entity: any): any {
    const { id, createdAt, updatedAt, deletedAt, ...sanitized } = entity;
    return sanitized;
  }

  private canBeModified(template: WorkflowTemplateWithRelationsDto): boolean {
    return (
      template.status === WorkflowStatus.DRAFT ||
      template.status === WorkflowStatus.ACTIVE
    );
  }

  private canBeDeleted(template: WorkflowTemplateWithRelationsDto): boolean {
    return (
      template.status === WorkflowStatus.DRAFT && template.usageCount === 0
    );
  }

  private hasSignificantChanges(dto: UpdateWorkflowTemplateDto): boolean {
    return !!(dto.name || dto.description || dto.type);
  }

  private mapToDto(template: WorkflowTemplate): WorkflowTemplateDto {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      status: template.status,
      isDefault: template.isDefault,
      version: template.version,
      usageCount: template.usageCount,
      lastUsedAt: template.lastUsedAt,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private mapToDtoWithRelations(
    template: WorkflowTemplate,
  ): WorkflowTemplateWithRelationsDto {
    return {
      ...this.mapToDto(template),
      stages:
        template.stages?.map((stage) => ({
          id: stage.id,
          name: stage.name,
          description: stage.description,
          type: stage.type,
          status: stage.status,
          order: stage.order,
          estimatedDuration: stage.estimatedDuration,
          durationUnit: stage.durationUnit,
          entryCriteria: Array.isArray(stage.entryCriteria)
            ? stage.entryCriteria
            : [],
          exitCriteria: Array.isArray(stage.exitCriteria)
            ? stage.exitCriteria
            : [],
          deliverables: Array.isArray(stage.deliverables)
            ? stage.deliverables
            : [],
          roles: Array.isArray(stage.roles)
            ? stage.roles.map((role: any) => role.role || role)
            : [],
          raciMatrix: stage.raciMatrix
            ? ({
                responsible: Array.isArray(stage.raciMatrix.responsible)
                  ? stage.raciMatrix.responsible.join(', ')
                  : '',
                accountable: Array.isArray(stage.raciMatrix.accountable)
                  ? stage.raciMatrix.accountable.join(', ')
                  : '',
                consulted: Array.isArray(stage.raciMatrix.consulted)
                  ? stage.raciMatrix.consulted.join(', ')
                  : '',
                informed: Array.isArray(stage.raciMatrix.informed)
                  ? stage.raciMatrix.informed.join(', ')
                  : '',
              } as Record<string, string>)
            : {},
          requiresApproval: stage.requiresApproval,
          isMilestone: stage.isMilestone,
          dependencies: Array.isArray(stage.dependencies)
            ? stage.dependencies
            : [],
          metadata: stage.metadata,
          createdAt: stage.createdAt,
          updatedAt: stage.updatedAt,
        })) || [],
      approvals:
        template.stages?.flatMap(
          (stage) =>
            stage.approvals?.map((approval) => ({
              id: approval.id,
              type: approval.type,
              status: approval.status,
              level: approval.level,
              title: approval.title,
              description: approval.description,
              criteria: Array.isArray(approval.criteria)
                ? approval.criteria
                : [],
              requiredDocuments: Array.isArray(approval.requiredDocuments)
                ? approval.requiredDocuments
                : [],
              dueDate: approval.dueDate,
              isRequired: approval.isRequired,
              canBeSkipped: approval.canBeSkipped,
              metadata: approval.metadata,
              createdAt: approval.createdAt,
              updatedAt: approval.updatedAt,
            })) || [],
        ) || [],
    };
  }
}
