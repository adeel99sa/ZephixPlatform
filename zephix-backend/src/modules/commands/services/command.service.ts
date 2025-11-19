import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Resource } from '../../resources/entities/resource.entity';
import { Task } from '../../tasks/entities/task.entity';

interface CommandResult {
  type: 'navigation' | 'action' | 'query';
  title: string;
  description?: string;
  action?: () => any;
  data?: any;
}

@Injectable()
export class CommandService {
  constructor(
    @InjectRepository(Project) private projectRepository: Repository<Project>,
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(Task) private taskRepository: Repository<Task>,
  ) {}

  async executeCommand(
    query: string,
    userId: string,
    organizationId: string,
  ): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Navigation commands
    if (lowerQuery.includes('project')) {
      const projects = await this.projectRepository.find({
        where: { organizationId },
        take: 5,
      });

      projects.forEach((project) => {
        results.push({
          type: 'navigation',
          title: `Go to ${project.name}`,
          description: 'Open project details',
          data: { route: `/projects/${project.id}` },
        });
      });
    }

    // Resource queries
    if (
      lowerQuery.includes('overallocated') ||
      lowerQuery.includes('conflict')
    ) {
      const overallocated =
        await this.findOverallocatedResources(organizationId);

      overallocated.forEach((resource) => {
        results.push({
          type: 'query',
          title: `${resource.name} at ${resource.allocation}% capacity`,
          description: 'Resource overallocated',
          data: resource,
        });
      });
    }

    // Task creation
    if (lowerQuery.includes('create task') || lowerQuery.includes('add task')) {
      results.push({
        type: 'action',
        title: 'Create New Task',
        description: 'Open task creation form',
        data: { action: 'createTask' },
      });
    }

    // KPI commands
    if (lowerQuery.includes('add kpi') || lowerQuery.includes('add metric')) {
      results.push({
        type: 'action',
        title: 'Add KPI Widget',
        description: 'Add a new KPI to dashboard',
        data: { action: 'addKpi' },
      });
    }

    return results;
  }

  private async findOverallocatedResources(organizationId: string) {
    // Use TypeORM QueryBuilder for proper parameter binding
    return this.resourceRepository
      .createQueryBuilder('r')
      .leftJoin('resource_allocations', 'ra', 'ra.resource_id = r.id')
      .where('r.organization_id = :orgId', { orgId: organizationId })
      .andWhere("ra.start_date <= CURRENT_DATE + INTERVAL '7 days'")
      .andWhere('ra.end_date >= CURRENT_DATE')
      .select('r.id', 'id')
      .addSelect('r.name', 'name')
      .addSelect('SUM(ra.allocation_percentage)', 'allocation')
      .groupBy('r.id, r.name')
      .having('SUM(ra.allocation_percentage) > 100')
      .getRawMany();
  }
}
