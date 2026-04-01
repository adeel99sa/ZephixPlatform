import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { WorkPhase } from '../work-management/entities/work-phase.entity';
import { WorkTask } from '../work-management/entities/work-task.entity';

const SAMPLE_PROJECT_NAME = 'Welcome to Zephix';
const SAMPLE_PROJECT_DESCRIPTION =
  'This is a sample project to help you explore Zephix. Feel free to modify or delete it.';

const SAMPLE_TASKS = [
  { title: 'Explore the project plan view', description: 'Navigate phases and tasks in the plan view.' },
  { title: 'Create your first real project', description: 'Use a template or start from scratch.' },
  { title: 'Invite team members', description: 'Go to Administration > Users to add your team.' },
  { title: 'Set up your workspace dashboard', description: 'Customize your workspace dashboard cards.' },
  { title: 'Review governance settings', description: 'Explore governance policies for project quality gates.' },
  { title: 'Try the AI advisory panel', description: 'Ask the AI assistant for project insights.' },
];

const SAMPLE_MILESTONE = {
  name: 'Team onboarded',
  description: 'Milestone: all team members have access and first project is created.',
};

@Injectable()
export class SampleProjectSeederService {
  private readonly logger = new Logger(SampleProjectSeederService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(WorkPhase)
    private readonly phaseRepo: Repository<WorkPhase>,
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
  ) {}

  /**
   * Seed a sample "Welcome to Zephix" project in a workspace.
   * Idempotent — skips if a project with the sample name already exists.
   * Non-blocking — failures are logged but never thrown.
   */
  async seedIfNeeded(input: {
    workspaceId: string;
    organizationId: string;
    creatorUserId: string;
  }): Promise<{ seeded: boolean; projectId?: string }> {
    try {
      // Idempotent check
      const existing = await this.projectRepo.findOne({
        where: {
          workspaceId: input.workspaceId,
          organizationId: input.organizationId,
          name: SAMPLE_PROJECT_NAME,
        },
      });
      if (existing) {
        return { seeded: false, projectId: existing.id };
      }

      // Create sample project
      const project = this.projectRepo.create({
        name: SAMPLE_PROJECT_NAME,
        description: SAMPLE_PROJECT_DESCRIPTION,
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        status: ProjectStatus.ACTIVE,
      });
      const savedProject = await this.projectRepo.save(project);
      const projectId = Array.isArray(savedProject) ? savedProject[0].id : savedProject.id;

      // Create a phase for tasks
      const phase = this.phaseRepo.create({
        name: 'Getting Started',
        projectId,
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        sortOrder: 0,
        isMilestone: false,
      });
      const savedPhase = await this.phaseRepo.save(phase);
      const phaseId = Array.isArray(savedPhase) ? savedPhase[0].id : savedPhase.id;

      // Create sample tasks
      for (let i = 0; i < SAMPLE_TASKS.length; i++) {
        const task = this.taskRepo.create({
          title: SAMPLE_TASKS[i].title,
          description: SAMPLE_TASKS[i].description,
          projectId,
          phaseId,
          organizationId: input.organizationId,
          workspaceId: input.workspaceId,
          assigneeUserId: input.creatorUserId,
          status: 'todo' as any,
        });
        await this.taskRepo.save(task);
      }

      // Create milestone phase
      const milestone = this.phaseRepo.create({
        name: SAMPLE_MILESTONE.name,
        projectId,
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        sortOrder: 1,
        isMilestone: true,
      });
      await this.phaseRepo.save(milestone);

      this.logger.log(
        `Seeded sample project "${SAMPLE_PROJECT_NAME}" (${projectId}) in workspace ${input.workspaceId}`,
      );

      return { seeded: true, projectId };
    } catch (error) {
      this.logger.error('Failed to seed sample project:', error);
      return { seeded: false };
    }
  }
}
