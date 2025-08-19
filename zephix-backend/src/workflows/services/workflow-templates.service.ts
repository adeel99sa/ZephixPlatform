import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { 
  WorkflowTemplateDto, 
  CreateWorkflowTemplateDto, 
  UpdateWorkflowTemplateDto, 
  WorkflowTemplatesResponseDto,
  WorkflowType,
  WorkflowStatus,
  StageType,
  StageStatus,
  ApprovalType,
  ApprovalStatus,
  ApprovalLevel
} from '../dto/workflow.dto';
import { WorkflowTemplate } from '../entities/workflow-template.entity';
import { WorkflowStage } from '../entities/workflow-stage.entity';
import { WorkflowApproval } from '../entities/workflow-approval.entity';
import { WorkflowVersion } from '../entities/workflow-version.entity';

export interface WorkflowTemplateWithRelations extends WorkflowTemplateDto {
  stages: Array<{
    id: string;
    name: string;
    description: string;
    type: StageType;
    status: StageStatus;
    order: number;
    estimatedDuration: number;
    durationUnit: string;
    entryCriteria?: string[];
    exitCriteria?: string[];
    deliverables?: string[];
    roles?: string[];
    raciMatrix?: Record<string, string>;
    requiresApproval: boolean;
    isMilestone: boolean;
    dependencies?: string[];
    metadata?: Record<string, any>;
    approvals?: Array<{
      id: string;
      title: string;
      description: string;
      type: ApprovalType;
      level: ApprovalLevel;
      isRequired: boolean;
      canBeSkipped: boolean;
      criteria?: string[];
      requiredDocuments?: string[];
      dueDate?: Date;
      escalationRules?: Record<string, any>;
    }>;
  }>;
}

@Injectable()
export class WorkflowTemplatesService {
  private readonly logger = new Logger(WorkflowTemplatesService.name);
  private readonly maxTemplatesPerOrganization: number;
  private readonly enableAuditLogging: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(WorkflowTemplate)
    private readonly workflowTemplateRepository: Repository<WorkflowTemplate>,
    @InjectRepository(WorkflowStage)
    private readonly workflowStageRepository: Repository<WorkflowStage>,
    @InjectRepository(WorkflowApproval)
    private readonly workflowApprovalRepository: Repository<WorkflowApproval>,
    @InjectRepository(WorkflowVersion)
    private readonly workflowVersionRepository: Repository<WorkflowVersion>,
  ) {
    this.maxTemplatesPerOrganization = this.configService.get<number>('WORKFLOW_MAX_TEMPLATES_PER_ORG', 50);
    this.enableAuditLogging = this.configService.get<boolean>('WORKFLOW_ENABLE_AUDIT_LOGGING', true);
  }

  async createWorkflowTemplate(
    createDto: CreateWorkflowTemplateDto,
    organizationId: string,
    userId: string,
  ): Promise<WorkflowTemplateDto> {
    try {
      this.logger.log(`Creating workflow template for organization: ${organizationId}`);

      // Validate organization template limits
      await this.validateOrganizationTemplateLimits(organizationId);

      // Validate template structure
      this.validateTemplateStructure(createDto);

      // Create workflow template
      const template = this.workflowTemplateRepository.create({
        id: uuidv4(),
        name: createDto.name,
        description: createDto.description,
        type: createDto.type,
        status: WorkflowStatus.DRAFT,
        version: 1,
        isDefault: createDto.isDefault || false,
        isPublic: createDto.isPublic || false,
        usageCount: 0,
        tags: createDto.tags || [],
        metadata: createDto.metadata || {},
        organizationId,
        createdBy: userId,
      });

      // Save template first to get the ID
      const savedTemplate = await this.workflowTemplateRepository.save(template);

      // Create stages and approvals
      const stages = await this.createWorkflowStages(createDto.stages, savedTemplate.id);
      const templateWithStages = await this.loadTemplateWithRelations(savedTemplate.id);

      // If this is set as default, unset other defaults
      if (createDto.isDefault) {
        await this.unsetOtherDefaults(organizationId, savedTemplate.id);
      }

      // Create initial version
      await this.createTemplateVersion(savedTemplate.id, userId, 'Initial version', templateWithStages);

      this.logger.log(`Workflow template created successfully: ${savedTemplate.id}`);

      return templateWithStages;
    } catch (error) {
      this.logger.error(`Failed to create workflow template: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to create workflow template: ${error.message}`);
    }
  }

  async getWorkflowTemplates(
    organizationId: string,
    status?: WorkflowStatus,
    type?: WorkflowType,
    isDefault?: boolean,
    isPublic?: boolean,
    tags?: string[],
    page = 1,
    limit = 20,
  ): Promise<WorkflowTemplatesResponseDto> {
    try {
      this.logger.log(`Retrieving workflow templates for organization: ${organizationId}`);

      // Build where clause
      const whereClause: FindOptionsWhere<WorkflowTemplate> = { organizationId };
      
      if (status) whereClause.status = status;
      if (type) whereClause.type = type;
      if (isDefault !== undefined) whereClause.isDefault = isDefault;
      if (isPublic !== undefined) whereClause.isPublic = isPublic;
      if (tags && tags.length > 0) {
        whereClause.tags = In(tags);
      }

      // Get total count
      const total = await this.workflowTemplateRepository.count({ where: whereClause });

      // Get paginated results
      const offset = (page - 1) * limit;
      const templates = await this.workflowTemplateRepository.find({
        where: whereClause,
        order: { 
          isDefault: 'DESC', 
          createdAt: 'DESC' 
        },
        skip: offset,
        take: limit,
      });

      // Load full template data with stages and approvals
      const templatesWithRelations = await Promise.all(
        templates.map(template => this.loadTemplateWithRelations(template.id))
      );

      const totalPages = Math.ceil(total / limit);

      return {
        templates: templatesWithRelations,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve workflow templates: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve workflow templates');
    }
  }

  async getWorkflowTemplateById(
    templateId: string,
    organizationId: string,
  ): Promise<WorkflowTemplateDto> {
    try {
      this.logger.log(`Retrieving workflow template: ${templateId}`);

      const template = await this.workflowTemplateRepository.findOne({
        where: { id: templateId, organizationId },
      });

      if (!template) {
        throw new NotFoundException(`Workflow template not found: ${templateId}`);
      }

      return await this.loadTemplateWithRelations(templateId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve workflow template: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve workflow template');
    }
  }

  async updateWorkflowTemplate(
    templateId: string,
    updateDto: UpdateWorkflowTemplateDto,
    organizationId: string,
    userId: string,
  ): Promise<WorkflowTemplateDto> {
    try {
      this.logger.log(`Updating workflow template: ${templateId}`);

      const template = await this.workflowTemplateRepository.findOne({
        where: { id: templateId, organizationId },
      });

      if (!template) {
        throw new NotFoundException(`Workflow template not found: ${templateId}`);
      }

      // Check if template can be modified
      if (!this.canModifyTemplate(template)) {
        throw new BadRequestException('Template cannot be modified in its current state');
      }

      // Update template fields
      Object.assign(template, updateDto);
      template.updatedAt = new Date();

      // If setting as default, unset other defaults
      if (updateDto.isDefault) {
        await this.unsetOtherDefaults(organizationId, templateId);
      }

      // Save updated template
      const updatedTemplate = await this.workflowTemplateRepository.save(template);

      // Create new version if significant changes
      if (this.hasSignificantChanges(updateDto)) {
        const templateWithRelations = await this.loadTemplateWithRelations(templateId);
        await this.createTemplateVersion(
          templateId, 
          userId, 
          'Template updated', 
          templateWithRelations
        );
      }

      this.logger.log(`Workflow template updated successfully: ${templateId}`);

      return await this.loadTemplateWithRelations(templateId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update workflow template: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update workflow template');
    }
  }

  async deleteWorkflowTemplate(
    templateId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Deleting workflow template: ${templateId}`);

      const template = await this.workflowTemplateRepository.findOne({
        where: { id: templateId, organizationId },
      });

      if (!template) {
        throw new NotFoundException(`Workflow template not found: ${templateId}`);
      }

      // Check if template can be deleted
      if (!this.canDeleteTemplate(template)) {
        throw new BadRequestException('Template cannot be deleted in its current state');
      }

      // Soft delete template and related entities
      await this.softDeleteTemplate(templateId);

      this.logger.log(`Workflow template deleted successfully: ${templateId}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to delete workflow template: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete workflow template');
    }
  }

  async cloneWorkflowTemplate(
    templateId: string,
    organizationId: string,
    userId: string,
    newName?: string,
  ): Promise<WorkflowTemplateDto> {
    try {
      this.logger.log(`Cloning workflow template: ${templateId}`);

      const originalTemplate = await this.getWorkflowTemplateById(templateId, organizationId);

      // Create new template with cloned data
      const clonedTemplate = this.workflowTemplateRepository.create({
        id: uuidv4(),
        name: newName || `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        type: originalTemplate.type,
        status: WorkflowStatus.DRAFT,
        version: 1,
        isDefault: false, // Cloned templates are never default
        isPublic: false, // Cloned templates are never public
        usageCount: 0,
        tags: [...(originalTemplate.tags || []), 'cloned'],
        metadata: { ...originalTemplate.metadata, clonedFrom: templateId },
        organizationId,
        createdBy: userId,
      });

      const savedTemplate = await this.workflowTemplateRepository.save(clonedTemplate);

      // Clone stages and approvals
      await this.cloneWorkflowStages(originalTemplate.stages, savedTemplate.id);

      this.logger.log(`Workflow template cloned successfully: ${savedTemplate.id}`);

      return await this.loadTemplateWithRelations(savedTemplate.id);
    } catch (error) {
      this.logger.error(`Failed to clone workflow template: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to clone workflow template');
    }
  }

  async getDefaultTemplate(organizationId: string): Promise<WorkflowTemplateDto | null> {
    try {
      const defaultTemplate = await this.workflowTemplateRepository.findOne({
        where: { organizationId, isDefault: true, status: WorkflowStatus.ACTIVE },
      });

      if (!defaultTemplate) {
        return null;
      }

      return await this.loadTemplateWithRelations(defaultTemplate.id);
    } catch (error) {
      this.logger.error(`Failed to retrieve default template: ${error.message}`, error.stack);
      return null;
    }
  }

  async incrementUsageCount(templateId: string, organizationId: string): Promise<void> {
    try {
      await this.workflowTemplateRepository.increment(
        { id: templateId, organizationId },
        'usageCount',
        1
      );
      
      await this.workflowTemplateRepository.update(
        { id: templateId, organizationId },
        { lastUsedAt: new Date() }
      );
    } catch (error) {
      this.logger.error(`Failed to increment usage count: ${error.message}`, error.stack);
    }
  }

  private async validateOrganizationTemplateLimits(organizationId: string): Promise<void> {
    const currentCount = await this.workflowTemplateRepository.count({
      where: { organizationId },
    });

    if (currentCount >= this.maxTemplatesPerOrganization) {
      throw new BadRequestException(
        `Organization has reached the maximum limit of ${this.maxTemplatesPerOrganization} workflow templates`
      );
    }
  }

  private validateTemplateStructure(createDto: CreateWorkflowTemplateDto): void {
    if (!createDto.stages || createDto.stages.length === 0) {
      throw new BadRequestException('Workflow template must have at least one stage');
    }

    // Validate stage order
    const stageOrders = createDto.stages.map(stage => stage.order).sort((a, b) => a - b);
    for (let i = 0; i < stageOrders.length; i++) {
      if (stageOrders[i] !== i + 1) {
        throw new BadRequestException('Stage orders must be sequential starting from 1');
      }
    }

    // Validate dependencies
    for (const stage of createDto.stages) {
      if (stage.dependencies) {
        for (const dependency of stage.dependencies) {
          const dependencyExists = createDto.stages.some(s => s.name === dependency);
          if (!dependencyExists) {
            throw new BadRequestException(`Stage dependency not found: ${dependency}`);
          }
        }
      }
    }
  }

  private async createWorkflowStages(
    stages: any[],
    templateId: string,
  ): Promise<WorkflowStage[]> {
    const createdStages: WorkflowStage[] = [];

    for (const stageData of stages) {
      const stage = this.workflowStageRepository.create({
        id: uuidv4(),
        name: stageData.name,
        description: stageData.description,
        type: stageData.type,
        status: StageStatus.ACTIVE,
        order: stageData.order,
        estimatedDuration: stageData.estimatedDuration,
        durationUnit: stageData.durationUnit,
        entryCriteria: stageData.entryCriteria || [],
        exitCriteria: stageData.exitCriteria || [],
        deliverables: stageData.deliverables || [],
        roles: stageData.roles || [],
        raciMatrix: stageData.raciMatrix || {},
        requiresApproval: stageData.requiresApproval,
        isMilestone: stageData.isMilestone,
        dependencies: stageData.dependencies || [],
        metadata: stageData.metadata || {},
        workflowTemplateId: templateId,
      });

      const savedStage = await this.workflowStageRepository.save(stage);

      // Create approvals if stage requires them
      if (stageData.approvals && stageData.approvals.length > 0) {
        await this.createWorkflowApprovals(stageData.approvals, savedStage.id);
      }

      createdStages.push(savedStage);
    }

    return createdStages;
  }

  private async createWorkflowApprovals(
    approvals: any[],
    stageId: string,
  ): Promise<WorkflowApproval[]> {
    const createdApprovals: WorkflowApproval[] = [];

    for (const approvalData of approvals) {
      const approval = this.workflowApprovalRepository.create({
        id: uuidv4(),
        title: approvalData.title,
        description: approvalData.description,
        type: approvalData.type,
        status: ApprovalStatus.PENDING,
        level: approvalData.level,
        isRequired: approvalData.isRequired,
        canBeSkipped: approvalData.canBeSkipped,
        criteria: approvalData.criteria || [],
        requiredDocuments: approvalData.requiredDocuments || [],
        dueDate: approvalData.dueDate,
        escalationRules: approvalData.escalationRules || {},
        metadata: approvalData.metadata || {},
        workflowStageId: stageId,
      });

      const savedApproval = await this.workflowApprovalRepository.save(approval);
      createdApprovals.push(savedApproval);
    }

    return createdApprovals;
  }

  private async loadTemplateWithRelations(templateId: string): Promise<WorkflowTemplateDto> {
    const template = await this.workflowTemplateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }

    const stages = await this.workflowStageRepository.find({
      where: { workflowTemplateId: templateId },
      order: { order: 'ASC' },
    });

    const stagesWithApprovals = await Promise.all(
      stages.map(async (stage) => {
        const approvals = await this.workflowApprovalRepository.find({
          where: { workflowStageId: stage.id },
        });

        return {
          id: stage.id,
          name: stage.name,
          description: stage.description,
          type: stage.type,
          status: stage.status,
          order: stage.order,
          estimatedDuration: stage.estimatedDuration,
          durationUnit: stage.durationUnit,
          entryCriteria: stage.entryCriteria,
          exitCriteria: stage.exitCriteria,
          deliverables: stage.deliverables,
          roles: stage.roles,
          raciMatrix: stage.raciMatrix,
          requiresApproval: stage.requiresApproval,
          isMilestone: stage.isMilestone,
          dependencies: stage.dependencies,
          metadata: stage.metadata,
          createdAt: stage.createdAt,
          updatedAt: stage.updatedAt,
          workflowTemplateId: stage.workflowTemplateId,
          approvals: approvals.map(approval => ({
            id: approval.id,
            title: approval.title,
            description: approval.description,
            type: approval.type,
            level: approval.level,
            isRequired: approval.isRequired,
            canBeSkipped: approval.canBeSkipped,
            criteria: approval.criteria,
            requiredDocuments: approval.requiredDocuments,
            dueDate: approval.dueDate,
            escalationRules: approval.escalationRules,
          })),
        };
      })
    );

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      status: template.status,
      version: template.version,
      isDefault: template.isDefault,
      isPublic: template.isPublic,
      usageCount: template.usageCount,
      lastUsedAt: template.lastUsedAt,
      tags: template.tags,
      metadata: template.metadata,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      organizationId: template.organizationId,
      createdBy: template.createdBy,
      stages: stagesWithApprovals,
    };
  }

  private async unsetOtherDefaults(organizationId: string, excludeTemplateId: string): Promise<void> {
    await this.workflowTemplateRepository.update(
      { organizationId, isDefault: true, id: excludeTemplateId },
      { isDefault: false }
    );
  }

  private async createTemplateVersion(
    templateId: string,
    userId: string,
    changeLog: string,
    templateData: WorkflowTemplateDto,
  ): Promise<void> {
    const version = this.workflowVersionRepository.create({
      id: uuidv4(),
      workflowTemplateId: templateId,
      createdBy: userId,
      versionNumber: Date.now(), // Simple versioning for now
      versionName: `v${Date.now()}`,
      description: changeLog,
      templateData: templateData,
      isPublished: false,
      metadata: { changeLog, createdBy: userId },
    });

    await this.workflowVersionRepository.save(version);
  }

  private canModifyTemplate(template: WorkflowTemplate): boolean {
    return template.status === WorkflowStatus.DRAFT || template.status === WorkflowStatus.ACTIVE;
  }

  private canDeleteTemplate(template: WorkflowTemplate): boolean {
    return template.status === WorkflowStatus.DRAFT && template.usageCount === 0;
  }

  private hasSignificantChanges(updateDto: UpdateWorkflowTemplateDto): boolean {
    return !!(updateDto.name || updateDto.description || updateDto.type);
  }

  private async softDeleteTemplate(templateId: string): Promise<void> {
    // Soft delete template
    await this.workflowTemplateRepository.update(
      { id: templateId },
      { deletedAt: new Date() }
    );

    // Soft delete stages
    await this.workflowStageRepository.update(
      { workflowTemplateId: templateId },
      { deletedAt: new Date() }
    );

    // Soft delete approvals
    const stages = await this.workflowStageRepository.find({
      where: { workflowTemplateId: templateId },
    });

    for (const stage of stages) {
      await this.workflowApprovalRepository.update(
        { workflowStageId: stage.id },
        { deletedAt: new Date() }
      );
    }
  }

  private async cloneWorkflowStages(
    stages: any[],
    newTemplateId: string,
  ): Promise<void> {
    for (const stageData of stages) {
      const stage = this.workflowStageRepository.create({
        id: uuidv4(),
        name: stageData.name,
        description: stageData.description,
        type: stageData.type,
        status: StageStatus.ACTIVE,
        order: stageData.order,
        estimatedDuration: stageData.estimatedDuration,
        durationUnit: stageData.durationUnit,
        entryCriteria: stageData.entryCriteria || [],
        exitCriteria: stageData.exitCriteria || [],
        deliverables: stageData.deliverables || [],
        roles: stageData.roles || [],
        raciMatrix: stageData.raciMatrix || {},
        requiresApproval: stageData.requiresApproval,
        isMilestone: stageData.isMilestone,
        dependencies: stageData.dependencies || [],
        metadata: { ...stageData.metadata, cloned: true },
        workflowTemplateId: newTemplateId,
      });

      const savedStage = await this.workflowStageRepository.save(stage);

      // Clone approvals
      if (stageData.approvals && stageData.approvals.length > 0) {
        for (const approvalData of stageData.approvals) {
          const approval = this.workflowApprovalRepository.create({
            id: uuidv4(),
            title: approvalData.title,
            description: approvalData.description,
            type: approvalData.type,
            status: ApprovalStatus.PENDING,
            level: approvalData.level,
            isRequired: approvalData.isRequired,
            canBeSkipped: approvalData.canBeSkipped,
            criteria: approvalData.criteria || [],
            requiredDocuments: approvalData.requiredDocuments || [],
            dueDate: approvalData.dueDate,
            escalationRules: approvalData.escalationRules || {},
            metadata: { ...approvalData.metadata, cloned: true },
            workflowStageId: savedStage.id,
          });

          await this.workflowApprovalRepository.save(approval);
        }
      }
    }
  }
}
