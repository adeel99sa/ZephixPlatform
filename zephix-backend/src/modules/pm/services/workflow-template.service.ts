import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, In } from 'typeorm';
import { WorkflowTemplate } from '../entities/workflow-template.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import {
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  CloneWorkflowTemplateDto,
  TemplateListQueryDto,
  CreateWorkflowInstanceDto,
  UpdateWorkflowInstanceDto,
  WorkflowActionDto,
} from '../dto/workflow-template.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkflowTemplateService {
  constructor(
    @InjectRepository(WorkflowTemplate)
    private templateRepository: Repository<WorkflowTemplate>,
    @InjectRepository(WorkflowInstance)
    private instanceRepository: Repository<WorkflowInstance>,
  ) {}

  async findByOrganization(
    organizationId: string,
    query: TemplateListQueryDto,
  ) {
    const {
      search,
      type,
      isActive,
      isDefault,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: FindOptionsWhere<WorkflowTemplate> = {
      organizationId,
    };

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isDefault !== undefined) {
      where.isDefault = isDefault;
    }

    const [templates, total] = await this.templateRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['instances'],
    });

    return {
      data: templates.map((template) => ({
        ...template,
        instanceCount: template.instances?.length || 0,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(
    organizationId: string,
    templateId: string,
  ): Promise<WorkflowTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, organizationId },
      relations: ['instances'],
    });

    if (!template) {
      throw new NotFoundException('Workflow template not found');
    }

    return template;
  }

  async create(
    organizationId: string,
    createDto: CreateWorkflowTemplateDto,
    userId: string,
  ): Promise<WorkflowTemplate> {
    // Validate stage configuration
    this.validateStageConfiguration(createDto.configuration.stages);

    // Check if setting as default and handle existing defaults
    if (createDto.isDefault) {
      await this.clearExistingDefaults(organizationId, createDto.type);
    }

    const template = this.templateRepository.create({
      ...createDto,
      organizationId,
      metadata: {
        ...createDto.metadata,
        version: '1.0.0',
        createdBy: userId,
        lastModifiedBy: userId,
      },
    } as any);

    return (await this.templateRepository.save(template)) as any;
  }

  async update(
    organizationId: string,
    templateId: string,
    updateDto: UpdateWorkflowTemplateDto,
    userId: string,
  ): Promise<WorkflowTemplate> {
    const template = await this.findById(organizationId, templateId);

    // Validate stage configuration if provided
    if (updateDto.configuration?.stages) {
      this.validateStageConfiguration(updateDto.configuration.stages);
    }

    // Check if setting as default and handle existing defaults
    if (updateDto.isDefault && !template.isDefault) {
      await this.clearExistingDefaults(organizationId, template.type);
    }

    // Update metadata
    const updatedMetadata = {
      ...template.metadata,
      ...updateDto.metadata,
      lastModifiedBy: userId,
      version: this.incrementVersion(template.metadata.version),
    };

    Object.assign(template, updateDto, { metadata: updatedMetadata });

    return await this.templateRepository.save(template);
  }

  async clone(
    organizationId: string,
    templateId: string,
    cloneDto: CloneWorkflowTemplateDto,
    userId: string,
  ): Promise<WorkflowTemplate> {
    const originalTemplate = await this.findById(organizationId, templateId);

    const clonedTemplate = this.templateRepository.create({
      ...originalTemplate,
      id: undefined, // Let TypeORM generate new ID
      name: cloneDto.name,
      description: cloneDto.description || `Copy of ${originalTemplate.name}`,
      isDefault: false, // Clones should never be default
      metadata: {
        ...originalTemplate.metadata,
        version: '1.0.0',
        createdBy: userId,
        lastModifiedBy: userId,
        tags: [...(originalTemplate.metadata.tags || []), 'cloned'],
      },
      createdAt: undefined,
      updatedAt: undefined,
    });

    return await this.templateRepository.save(clonedTemplate);
  }

  async activate(
    organizationId: string,
    templateId: string,
  ): Promise<WorkflowTemplate> {
    const template = await this.findById(organizationId, templateId);

    template.isActive = true;
    return await this.templateRepository.save(template);
  }

  async deactivate(
    organizationId: string,
    templateId: string,
  ): Promise<WorkflowTemplate> {
    const template = await this.findById(organizationId, templateId);

    // Check if there are active instances
    const activeInstanceCount = await this.instanceRepository.count({
      where: {
        templateId,
        organizationId,
        status: In(['active', 'processing']),
      },
    });

    if (activeInstanceCount > 0) {
      throw new ConflictException(
        'Cannot deactivate template with active instances',
      );
    }

    template.isActive = false;
    return await this.templateRepository.save(template);
  }

  async delete(organizationId: string, templateId: string): Promise<void> {
    const template = await this.findById(organizationId, templateId);

    // Check if there are any instances
    const instanceCount = await this.instanceRepository.count({
      where: { templateId, organizationId },
    });

    if (instanceCount > 0) {
      throw new ConflictException(
        'Cannot delete template with existing instances',
      );
    }

    await this.templateRepository.remove(template);
  }

  async getDefaultTemplates(organizationId: string) {
    return await this.templateRepository.find({
      where: { organizationId, isDefault: true, isActive: true },
      order: { type: 'ASC', name: 'ASC' },
    });
  }

  // Workflow Instance Management
  async createInstance(
    organizationId: string,
    createDto: CreateWorkflowInstanceDto,
    userId: string,
  ): Promise<WorkflowInstance> {
    const template = await this.findById(organizationId, createDto.templateId);

    if (!template.isActive) {
      throw new BadRequestException(
        'Cannot create instance from inactive template',
      );
    }

    const firstStage = template.configuration.stages[0];
    if (!firstStage) {
      throw new BadRequestException('Template has no stages configured');
    }

    const instance = this.instanceRepository.create({
      ...createDto,
      organizationId,
      currentStage: firstStage.id,
      createdBy: userId,
      dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
      stageHistory: [
        {
          stageId: firstStage.id,
          enteredAt: new Date(),
          actor: userId,
          notes: 'Workflow instance created',
        },
      ],
    } as any);

    return (await this.instanceRepository.save(instance)) as any;
  }

  async findInstances(organizationId: string, query: any) {
    const {
      search,
      status,
      templateId,
      assignedTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: FindOptionsWhere<WorkflowInstance> = {
      organizationId,
    };

    if (search) {
      where.title = Like(`%${search}%`);
    }

    if (status) {
      where.status = status;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    const [instances, total] = await this.instanceRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['template', 'assignedUser', 'creator'],
    });

    return {
      data: instances,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findInstanceById(
    organizationId: string,
    instanceId: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, organizationId },
      relations: ['template', 'assignedUser', 'creator'],
    });

    if (!instance) {
      throw new NotFoundException('Workflow instance not found');
    }

    return instance;
  }

  async updateInstance(
    organizationId: string,
    instanceId: string,
    updateDto: UpdateWorkflowInstanceDto,
  ): Promise<WorkflowInstance> {
    const instance = await this.findInstanceById(organizationId, instanceId);

    Object.assign(instance, updateDto);

    if (updateDto.dueDate) {
      instance.dueDate = new Date(updateDto.dueDate);
    }

    return await this.instanceRepository.save(instance);
  }

  async executeAction(
    organizationId: string,
    instanceId: string,
    actionDto: WorkflowActionDto,
    userId: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.findInstanceById(organizationId, instanceId);
    const template = await this.findById(organizationId, instance.templateId);

    switch (actionDto.action) {
      case 'approve':
        return await this.approveStage(
          instance,
          template,
          userId,
          actionDto.comments,
        );

      case 'reject':
        return await this.rejectStage(
          instance,
          template,
          userId,
          actionDto.comments,
        );

      case 'move_to_stage':
        if (!actionDto.targetStageId) {
          throw new BadRequestException(
            'Target stage ID is required for move action',
          );
        }
        return await this.moveToStage(
          instance,
          template,
          actionDto.targetStageId,
          userId,
          actionDto.comments,
        );

      case 'assign':
        if (!actionDto.assignTo) {
          throw new BadRequestException(
            'User ID is required for assign action',
          );
        }
        instance.assignedTo = actionDto.assignTo;
        return await this.instanceRepository.save(instance);

      default:
        throw new BadRequestException('Invalid action');
    }
  }

  // Private helper methods
  private validateStageConfiguration(stages: any[]): void {
    if (!stages || stages.length === 0) {
      throw new BadRequestException('At least one stage is required');
    }

    const stageIds = new Set();
    for (const stage of stages) {
      if (stageIds.has(stage.id)) {
        throw new BadRequestException(`Duplicate stage ID: ${stage.id}`);
      }
      stageIds.add(stage.id);
    }
  }

  private async clearExistingDefaults(
    organizationId: string,
    type: string,
  ): Promise<void> {
    await this.templateRepository.update(
      { organizationId, type, isDefault: true },
      { isDefault: false },
    );
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const patch = parseInt(parts[2]) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private async approveStage(
    instance: WorkflowInstance,
    template: WorkflowTemplate,
    userId: string,
    comments?: string,
  ): Promise<WorkflowInstance> {
    // Add approval record
    instance.approvals.push({
      stageId: instance.currentStage,
      approverId: userId,
      status: 'approved',
      comments,
      timestamp: new Date(),
    });

    // Check if we can move to next stage
    if (instance.canProgressToNextStage()) {
      const nextStage = template.getNextStage(instance.currentStage);
      if (nextStage) {
        return await this.moveToStage(
          instance,
          template,
          nextStage.id,
          userId,
          'Auto-progressed after approval',
        );
      } else {
        // No next stage, mark as completed
        instance.status = 'completed';
        instance.stageHistory.push({
          stageId: instance.currentStage,
          enteredAt: instance.getCurrentStageEntry()?.enteredAt || new Date(),
          exitedAt: new Date(),
          actor: userId,
          notes: 'Workflow completed',
        });
      }
    }

    return await this.instanceRepository.save(instance);
  }

  private async rejectStage(
    instance: WorkflowInstance,
    template: WorkflowTemplate,
    userId: string,
    comments?: string,
  ): Promise<WorkflowInstance> {
    // Add rejection record
    instance.approvals.push({
      stageId: instance.currentStage,
      approverId: userId,
      status: 'rejected',
      comments,
      timestamp: new Date(),
    });

    // Move to previous stage or mark as failed
    const previousStage = template.getPreviousStage(instance.currentStage);
    if (previousStage) {
      return await this.moveToStage(
        instance,
        template,
        previousStage.id,
        userId,
        `Rejected: ${comments}`,
      );
    } else {
      instance.status = 'failed';
    }

    return await this.instanceRepository.save(instance);
  }

  private async moveToStage(
    instance: WorkflowInstance,
    template: WorkflowTemplate,
    targetStageId: string,
    userId: string,
    notes?: string,
  ): Promise<WorkflowInstance> {
    const targetStage = template.getStageById(targetStageId);
    if (!targetStage) {
      throw new BadRequestException('Invalid target stage');
    }

    // Close current stage
    if (instance.currentStage) {
      const currentEntry = instance.getCurrentStageEntry();
      if (currentEntry && !currentEntry.exitedAt) {
        currentEntry.exitedAt = new Date();
      }
    }

    // Enter new stage
    instance.currentStage = targetStageId;
    instance.stageHistory.push({
      stageId: targetStageId,
      enteredAt: new Date(),
      actor: userId,
      notes,
    });

    return await this.instanceRepository.save(instance);
  }
}
