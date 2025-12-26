import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import {
  WorkItem,
  WorkItemStatus,
  WorkItemType,
} from './entities/work-item.entity';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';

interface ListOptions {
  organizationId: string;
  workspaceId?: string;
  projectId?: string;
  status?: string;
  assigneeId?: string;
  limit?: number;
  offset?: number;
}

interface CreateOptions extends CreateWorkItemDto {
  organizationId: string;
  createdBy: string;
}

interface UpdateOptions extends UpdateWorkItemDto {
  updatedBy?: string;
}

interface KpiOptions {
  organizationId: string;
  workspaceId?: string;
  projectId?: string;
}

@Injectable()
export class WorkItemService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkItem))
    private workItemRepository: TenantAwareRepository<WorkItem>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async list(options: ListOptions) {
    // organizationId now comes from tenant context, not options
    const organizationId = this.tenantContextService.assertOrganizationId();

    const where: any = {
      deletedAt: IsNull(),
    };

    // workspaceId filter is automatic for WorkspaceScoped entities when in context
    // But we can still filter by explicit workspaceId if provided
    if (options.workspaceId) {
      where.workspaceId = options.workspaceId;
    }

    if (options.projectId) {
      where.projectId = options.projectId;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.assigneeId) {
      where.assigneeId = options.assigneeId;
    }

    // TenantAwareRepository automatically adds organizationId filter
    return this.workItemRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: options.limit || 50,
      skip: options.offset || 0,
    });
  }

  async getOne(id: string, organizationId?: string) {
    // organizationId now comes from tenant context if not provided
    const orgId =
      organizationId || this.tenantContextService.assertOrganizationId();

    // TenantAwareRepository automatically adds organizationId filter
    const item = await this.workItemRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!item) {
      throw new NotFoundException(`Work item with id ${id} not found`);
    }

    return item;
  }

  async create(options: CreateOptions) {
    if (!options.title || !options.workspaceId || !options.projectId) {
      throw new BadRequestException(
        'title, workspaceId, and projectId are required',
      );
    }

    const item = this.workItemRepository.create({
      ...options,
      deletedAt: null,
    });

    return this.workItemRepository.save(item);
  }

  async update(id: string, organizationId: string, options: UpdateOptions) {
    // organizationId parameter kept for backward compatibility but not used in query
    const item = await this.getOne(id);

    Object.assign(item, options);

    return this.workItemRepository.save(item);
  }

  async completedRatioByProject(options: KpiOptions) {
    // organizationId now comes from tenant context
    const organizationId = this.tenantContextService.assertOrganizationId();

    const whereBase: any = {
      projectId: options.projectId,
      deletedAt: IsNull(),
    };

    // TenantAwareRepository automatically adds organizationId filter
    const [completed, total] = await Promise.all([
      this.workItemRepository.count({
        where: { ...whereBase, status: WorkItemStatus.DONE },
      }),
      this.workItemRepository.count({ where: whereBase }),
    ]);

    const ratio = total > 0 ? completed / total : 0;

    return { data: { completed, total, ratio } };
  }

  async completedRatioByWorkspace(options: KpiOptions) {
    // organizationId now comes from tenant context
    const organizationId = this.tenantContextService.assertOrganizationId();

    const whereBase: any = {
      deletedAt: IsNull(),
    };

    if (options.workspaceId) {
      whereBase.workspaceId = options.workspaceId;
    }

    // TenantAwareRepository automatically adds organizationId filter
    const [completed, total] = await Promise.all([
      this.workItemRepository.count({
        where: { ...whereBase, status: WorkItemStatus.DONE },
      }),
      this.workItemRepository.count({ where: whereBase }),
    ]);

    const ratio = total > 0 ? completed / total : 0;

    return { data: { completed, total, ratio } };
  }
}
