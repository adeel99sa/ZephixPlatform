import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectTemplate } from '../entities/project-template.entity';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectRiskLevel,
} from '../../projects/entities/project.entity';
import { Task } from '../../projects/entities/task.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(ProjectTemplate)
    private templateRepository: Repository<ProjectTemplate>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new template
   */
  async create(
    dto: CreateTemplateDto,
    userId: string,
    organizationId: string,
  ): Promise<ProjectTemplate> {
    // If setting as default, unset other defaults in the same scope
    if (dto.isDefault) {
      const scope = dto.scope || 'organization';
      await this.templateRepository
        .createQueryBuilder()
        .update(ProjectTemplate)
        .set({ isDefault: false })
        .where('organizationId = :organizationId', { organizationId })
        .andWhere('scope = :scope', { scope })
        .andWhere('isDefault = :isDefault', { isDefault: true })
        .execute();
    }

    const template = this.templateRepository.create({
      ...dto,
      organizationId,
      createdById: userId,
      scope: dto.scope || 'organization',
      phases: dto.phases || [],
      taskTemplates: dto.taskTemplates || [],
      availableKPIs: dto.availableKPIs || [],
      defaultEnabledKPIs: dto.defaultEnabledKPIs || [],
      isActive: true, // New templates are active by default
    });

    return this.templateRepository.save(template);
  }

  /**
   * List all templates accessible to the organization
   */
  async findAll(
    organizationId: string,
    scope?: 'organization' | 'team' | 'personal',
  ): Promise<ProjectTemplate[]> {
    const where: any = [
      { isSystem: true, isActive: true }, // System templates available to all
      { organizationId, isActive: true }, // Org templates
    ];

    if (scope) {
      where.push({ organizationId, scope, isActive: true });
    }

    return this.templateRepository.find({
      where,
      order: {
        isSystem: 'DESC', // System templates first
        isDefault: 'DESC', // Default templates first
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Get a single template by ID with organization check
   */
  async findOne(id: string, organizationId: string): Promise<ProjectTemplate> {
    const template = await this.templateRepository.findOne({
      where: [
        { id, isSystem: true, isActive: true }, // System templates accessible to all
        { id, organizationId, isActive: true }, // Org templates
      ],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Update a template
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateTemplateDto,
  ): Promise<ProjectTemplate> {
    const template = await this.findOne(id, organizationId);

    // Prevent editing system templates
    if (template.isSystem) {
      throw new ForbiddenException('Cannot edit system templates');
    }

    // Ensure organization matches (skip check for system templates)
    if (!template.isSystem && template.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Cannot edit templates from other organizations',
      );
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      const scope = dto.scope || template.scope;
      await this.templateRepository
        .createQueryBuilder()
        .update(ProjectTemplate)
        .set({ isDefault: false })
        .where('organizationId = :organizationId', { organizationId })
        .andWhere('scope = :scope', { scope })
        .andWhere('isDefault = :isDefault', { isDefault: true })
        .andWhere('id != :id', { id })
        .execute();
    }

    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  /**
   * Soft delete a template
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const template = await this.findOne(id, organizationId);

    // Prevent deleting system templates
    if (template.isSystem) {
      throw new ForbiddenException('Cannot delete system templates');
    }

    // Ensure organization matches (skip check for system templates)
    if (!template.isSystem && template.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Cannot delete templates from other organizations',
      );
    }

    await this.templateRepository.remove(template);
  }

  /**
   * Archive a template (soft delete by setting isActive to false)
   */
  async archive(id: string, organizationId: string): Promise<void> {
    const template = await this.findOne(id, organizationId);

    // Prevent archiving system templates
    if (template.isSystem) {
      throw new ForbiddenException('Cannot archive system templates');
    }

    // Ensure organization matches (skip check for system templates)
    if (!template.isSystem && template.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Cannot archive templates from other organizations',
      );
    }

    template.isActive = false;
    await this.templateRepository.save(template);
  }

  /**
   * Set a template as organization-wide default
   */
  async setAsDefault(
    id: string,
    organizationId: string,
  ): Promise<ProjectTemplate> {
    const template = await this.findOne(id, organizationId);

    // Unset other defaults in the same scope
    await this.templateRepository
      .createQueryBuilder()
      .update(ProjectTemplate)
      .set({ isDefault: false })
      .where('organizationId = :organizationId', { organizationId })
      .andWhere('scope = :scope', { scope: template.scope })
      .andWhere('isDefault = :isDefault', { isDefault: true })
      .execute();

    template.isDefault = true;
    return this.templateRepository.save(template);
  }

  /**
   * Clone an existing template
   */
  async cloneTemplate(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<ProjectTemplate> {
    const sourceTemplate = await this.findOne(id, organizationId);

    const clonedTemplate = this.templateRepository.create({
      name: `${sourceTemplate.name} (Copy)`,
      description: sourceTemplate.description,
      methodology: sourceTemplate.methodology,
      phases: [...sourceTemplate.phases],
      taskTemplates: [...sourceTemplate.taskTemplates],
      availableKPIs: [...sourceTemplate.availableKPIs],
      defaultEnabledKPIs: [...sourceTemplate.defaultEnabledKPIs],
      scope: sourceTemplate.scope,
      teamId: sourceTemplate.teamId,
      organizationId,
      createdById: userId,
      isDefault: false,
      isSystem: false, // Cloned templates are never system templates
    });

    return this.templateRepository.save(clonedTemplate);
  }

  /**
   * Apply a template to create a new project with phases and tasks
   * All operations are wrapped in a transaction for atomicity
   */
  async applyTemplate(
    templateId: string,
    payload: {
      name: string;
      workspaceId: string;
      startDate?: Date;
      description?: string;
    },
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    return this.dataSource.transaction(async (manager) => {
      const templateRepo = manager.getRepository(ProjectTemplate);
      const workspaceRepo = manager.getRepository(Workspace);
      const projectRepo = manager.getRepository(Project);
      const taskRepo = manager.getRepository(Task);

      // 1. Load template by id and organizationId, isActive true
      const template = await templateRepo.findOne({
        where: [
          { id: templateId, isSystem: true, isActive: true },
          { id: templateId, organizationId, isActive: true },
        ],
      });

      if (!template) {
        throw new NotFoundException(
          `Template with ID ${templateId} not found or not active`,
        );
      }

      // Verify template belongs to organization (skip check for system templates)
      if (!template.isSystem && template.organizationId !== organizationId) {
        throw new ForbiddenException(
          'Template does not belong to your organization',
        );
      }

      // 2. Load workspace by payload.workspaceId and organizationId
      const workspace = await workspaceRepo.findOne({
        where: { id: payload.workspaceId },
        select: ['id', 'organizationId'],
      });

      if (!workspace) {
        throw new NotFoundException(
          `Workspace with ID ${payload.workspaceId} not found`,
        );
      }

      if (workspace.organizationId !== organizationId) {
        throw new ForbiddenException(
          'Workspace does not belong to your organization',
        );
      }

      // 3. Create project row
      // Match the structure used in ProjectsService.createProject
      const project = projectRepo.create({
        name: payload.name,
        description: payload.description || null,
        workspaceId: payload.workspaceId,
        organizationId: organizationId,
        createdById: userId,
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.MEDIUM,
        riskLevel: ProjectRiskLevel.MEDIUM,
        methodology: template.methodology || 'agile',
        startDate: payload.startDate || undefined,
      });

      const savedProject = await projectRepo.save(project);

      // 4. Create tasks from template.structure.taskTemplates, if present
      // Note: Phase entity does not exist, so we skip phase creation
      if (template.taskTemplates && template.taskTemplates.length > 0) {
        // Get count of existing tasks for this project to generate unique task numbers
        const existingTaskCount = await taskRepo.count({
          where: { projectId: savedProject.id },
        });

        const tasksToCreate = template.taskTemplates.map(
          (taskTemplate, index) => {
            const taskData: any = {
              projectId: savedProject.id,
              title: taskTemplate.name,
              description: taskTemplate.description || null,
              estimatedHours: taskTemplate.estimatedHours || 0,
              priority: taskTemplate.priority || 'medium',
              status: 'not_started',
              taskNumber: `TASK-${existingTaskCount + index + 1}`,
              taskType: 'task',
              assignmentType: 'internal',
              progressPercentage: 0,
              isMilestone: false,
              isBlocked: false,
              createdById: userId,
              // phaseId is not set since Phase entity doesn't exist
              // phaseOrder from template is ignored for now
            };

            // Add organizationId - database requires it even though entity doesn't define it
            // Use snake_case to match database column name
            if (savedProject.organizationId) {
              taskData.organization_id = savedProject.organizationId;
            }

            return taskData;
          },
        );

        // Create and save tasks using raw query to handle organization_id
        // (Entity doesn't define organizationId but database requires it)
        for (const taskData of tasksToCreate) {
          await manager.query(
            `INSERT INTO tasks (
              project_id, title, description, estimated_hours, priority, status,
              task_number, task_type, assignment_type, progress_percentage,
              is_milestone, is_blocked, created_by, organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              savedProject.id,
              taskData.title,
              taskData.description || null,
              taskData.estimatedHours || 0,
              taskData.priority || 'medium',
              taskData.status || 'not_started',
              taskData.taskNumber,
              taskData.taskType || 'task',
              taskData.assignmentType || 'internal',
              taskData.progressPercentage || 0,
              taskData.isMilestone || false,
              taskData.isBlocked || false,
              taskData.createdById || null,
              savedProject.organizationId,
            ],
          );
        }
      }

      // 5. Template usage tracking - skip if no usage entity exists
      // (No TemplateUsage entity found in codebase)

      return savedProject;
    });
  }
}
