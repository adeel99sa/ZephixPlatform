import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectTemplate } from '../entities/project-template.entity';
import { Project, ProjectStatus } from '../../projects/entities/project.entity';
import { Task } from '../../projects/entities/task.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspacePermissionService } from '../../workspaces/services/workspace-permission.service';
import { Risk } from '../../risks/entities/risk.entity';
import { ProjectMetrics } from '../../../pm/entities/project-metrics.entity';

/**
 * Phase 4: Template instantiation service
 * Handles creating projects from templates with permission checks
 */
@Injectable()
export class TemplatesInstantiateService {
  private readonly logger = new Logger(TemplatesInstantiateService.name);

  constructor(
    @InjectRepository(ProjectTemplate)
    private templateRepository: Repository<ProjectTemplate>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly workspacePermissionService: WorkspacePermissionService,
  ) {}

  /**
   * Phase 4: Instantiate a template to create a project
   * Checks create_projects_in_workspace permission
   */
  async instantiate(
    templateId: string,
    payload: {
      workspaceId: string;
      name: string;
      startDate?: Date;
      endDate?: Date;
      ownerId?: string;
    },
    organizationId: string,
    userId: string,
    userRole?: 'owner' | 'admin' | 'member' | 'viewer',
  ): Promise<{ id: string; name: string; workspaceId: string }> {
    return this.dataSource.transaction(async (manager) => {
      const templateRepo = manager.getRepository(ProjectTemplate);
      const workspaceRepo = manager.getRepository(Workspace);
      const projectRepo = manager.getRepository(Project);
      const taskRepo = manager.getRepository(Task);

      // 1. Load template
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

      // 2. Load workspace and verify organization
      const workspace = await workspaceRepo.findOne({
        where: { id: payload.workspaceId },
        select: ['id', 'organizationId', 'ownerId'],
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

      // 3. Phase 4: Check workspace permission
      const userContext = {
        id: userId,
        organizationId,
        role: userRole || 'member',
      };

      const hasPermission = await this.workspacePermissionService.isAllowed(
        userContext,
        payload.workspaceId,
        'create_project_in_workspace',
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have permission to create projects in this workspace',
        );
      }

      // 4. Create project
      const project = projectRepo.create({
        name: payload.name,
        workspaceId: payload.workspaceId,
        organizationId,
        status: ProjectStatus.PLANNING,
        methodology: template.methodology || 'agile',
        startDate: payload.startDate,
        endDate: payload.endDate,
        projectManagerId: payload.ownerId || workspace.ownerId || userId,
        createdById: userId,
      });

      const savedProject = await projectRepo.save(project);

      // 5. Create tasks from template structure
      // Phase 4: Use simplified structure if available, otherwise use phases/taskTemplates
      let taskCounter = 1;

      if (template.structure?.phases) {
        // Use new simplified structure
        for (const phase of template.structure.phases) {
          for (const taskTemplate of phase.tasks || []) {
            const task = taskRepo.create({
              title: taskTemplate.name,
              description: taskTemplate.description || '',
              projectId: savedProject.id,
              taskNumber: `TASK-${taskCounter++}`,
              status: 'not_started',
              priority: 'medium',
              estimatedHours: taskTemplate.estimatedHours || 0,
              createdById: userId,
            });
            await taskRepo.save(task);
          }
        }
      } else {
        // Fallback to legacy phases/taskTemplates structure
        // TODO: Phase 5 - Migrate all templates to new structure
        for (const taskTemplate of template.taskTemplates || []) {
          const task = taskRepo.create({
            title: taskTemplate.name,
            description: taskTemplate.description || '',
            projectId: savedProject.id,
            taskNumber: `TASK-${taskCounter++}`,
            status: 'not_started',
            priority: taskTemplate.priority || 'medium',
            estimatedHours: taskTemplate.estimatedHours || 0,
            createdById: userId,
          });
          await taskRepo.save(task);
        }
      }

      // Phase 5: Create risks from template risk presets
      if (template.riskPresets && template.riskPresets.length > 0) {
        const riskRepo = manager.getRepository(Risk);
        for (const riskPreset of template.riskPresets) {
          const risk = riskRepo.create({
            projectId: savedProject.id,
            organizationId: savedProject.organizationId,
            type: riskPreset.category || 'general',
            severity: riskPreset.severity,
            title: riskPreset.title,
            description: riskPreset.description || '',
            status: 'open',
            detectedAt: new Date(),
            source: 'template_preset',
            evidence: riskPreset.tags ? { tags: riskPreset.tags } : null,
          });
          await riskRepo.save(risk);
        }
        this.logger.log(
          `Created ${template.riskPresets.length} risks from template presets for project ${savedProject.id}`,
        );
      }

      // Phase 5: Create KPI metrics from template KPI presets
      if (template.kpiPresets && template.kpiPresets.length > 0) {
        const metricsRepo = manager.getRepository(ProjectMetrics);
        for (const kpiPreset of template.kpiPresets) {
          const targetValue =
            typeof kpiPreset.targetValue === 'number'
              ? kpiPreset.targetValue
              : parseFloat(String(kpiPreset.targetValue)) || 0;

          const metric = metricsRepo.create({
            projectId: savedProject.id,
            metricDate: new Date(),
            metricType: kpiPreset.metricType,
            metricCategory: 'template_preset',
            metricValue: targetValue,
            metricUnit: kpiPreset.unit || 'count',
            metricMetadata: {
              source: 'template_preset',
              confidence: 1.0,
              trend: 'stable' as const,
              target: targetValue,
              direction: kpiPreset.direction,
              kpiPresetId: kpiPreset.id,
            },
            recordedBy: userId,
            notes: kpiPreset.description || '',
          } as Partial<ProjectMetrics>);
          await metricsRepo.save(metric);
        }
        this.logger.log(
          `Created ${template.kpiPresets.length} KPI metrics from template presets for project ${savedProject.id}`,
        );
      }

      return {
        id: savedProject.id,
        name: savedProject.name,
        workspaceId: savedProject.workspaceId,
      };
    });
  }
}
