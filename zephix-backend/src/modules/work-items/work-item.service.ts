import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  WorkItem,
  WorkItemStatus,
  WorkItemType,
} from './entities/work-item.entity';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';

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
    @InjectRepository(WorkItem)
    private workItemRepository: Repository<WorkItem>,
  ) {}

  async list(options: ListOptions) {
    const where: any = {
      organizationId: options.organizationId,
      deletedAt: IsNull(),
    };

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

    return this.workItemRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: options.limit || 50,
      skip: options.offset || 0,
    });
  }

  async getOne(id: string, organizationId: string) {
    const item = await this.workItemRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
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
    const item = await this.getOne(id, organizationId);

    Object.assign(item, options);

    return this.workItemRepository.save(item);
  }

  async completedRatioByProject(options: KpiOptions) {
    const whereBase = {
      organizationId: options.organizationId,
      projectId: options.projectId,
      deletedAt: IsNull(),
    };

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
    const whereBase: any = {
      organizationId: options.organizationId,
      deletedAt: IsNull(),
    };

    if (options.workspaceId) {
      whereBase.workspaceId = options.workspaceId;
    }

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
