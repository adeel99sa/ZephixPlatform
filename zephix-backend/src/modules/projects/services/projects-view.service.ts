import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Project } from '../entities/project.entity';
import { ProjectView } from '../entities/project-view.entity';
import { CreateProjectSimpleDto } from '../dto/create-project-simple.dto';

@Injectable()
export class ProjectsViewService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Project))
    private readonly projectRepo: TenantAwareRepository<Project>,
    @Inject(getTenantAwareRepositoryToken(ProjectView))
    private readonly viewRepo: TenantAwareRepository<ProjectView>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async create(
    workspaceId: string,
    organizationId: string,
    dto: CreateProjectSimpleDto,
  ) {
    const orgId = this.tenantContextService.assertOrganizationId();

    const project = this.projectRepo.create({
      workspaceId,
      organizationId: orgId,
      name: dto.name,
    });

    const saved = await this.projectRepo.save(project);

    const views = [
      this.viewRepo.create({
        projectId: saved.id,
        type: 'list',
        label: 'List',
        sortOrder: 0,
        isEnabled: true,
      }),
      this.viewRepo.create({
        projectId: saved.id,
        type: 'board',
        label: 'Board',
        sortOrder: 1,
        isEnabled: false,
      }),
      this.viewRepo.create({
        projectId: saved.id,
        type: 'calendar',
        label: 'Calendar',
        sortOrder: 2,
        isEnabled: false,
      }),
      this.viewRepo.create({
        projectId: saved.id,
        type: 'gantt',
        label: 'Gantt',
        sortOrder: 3,
        isEnabled: false,
      }),
      this.viewRepo.create({
        projectId: saved.id,
        type: 'team',
        label: 'Team',
        sortOrder: 4,
        isEnabled: false,
      }),
      this.viewRepo.create({
        projectId: saved.id,
        type: 'doc',
        label: 'Docs',
        sortOrder: 5,
        isEnabled: true,
      }),
      this.viewRepo.create({
        projectId: saved.id,
        type: 'dashboard',
        label: 'Dashboard',
        sortOrder: 6,
        isEnabled: false,
      }),
    ];

    await this.viewRepo.saveMany(views);

    return saved;
  }

  async get(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async listViews(projectId: string) {
    return this.viewRepo.find({
      where: { projectId },
      order: { sortOrder: 'ASC' },
    });
  }

  async enableView(projectId: string, type: string, isEnabled: boolean) {
    const view = await this.viewRepo.findOne({
      where: { projectId, type: type as any },
    });
    if (!view) throw new NotFoundException('View not found');
    view.isEnabled = isEnabled;
    return this.viewRepo.save(view);
  }
}
