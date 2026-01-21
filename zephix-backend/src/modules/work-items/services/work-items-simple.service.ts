import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { WorkItem, WorkItemStatus } from '../entities/work-item.entity';
import { CreateWorkItemSimpleDto } from '../dto/create-work-item-simple.dto';
import { UpdateWorkItemSimpleDto } from '../dto/update-work-item-simple.dto';
import { WorkItemKeyService } from '../work-item-key.service';

@Injectable()
export class WorkItemsSimpleService {
  constructor(
    @InjectRepository(WorkItem) private readonly repo: Repository<WorkItem>,
    private readonly keyService: WorkItemKeyService,
  ) {}

  async create(workspaceId: string, organizationId: string, projectId: string, dto: CreateWorkItemSimpleDto) {
    const nextKey = await this.keyService.nextKey(workspaceId, 'ZPX');

    const status: WorkItemStatus = (dto.status as WorkItemStatus) ?? WorkItemStatus.TODO;

    const item = this.repo.create({
      organizationId,
      projectId,
      parentId: dto.parentId ?? null,

      key: nextKey,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,

      status,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    } as DeepPartial<WorkItem>);

    return this.repo.save(item);
  }

  async list(workspaceId: string, projectId: string) {
    return this.repo.find({
      where: { workspaceId, projectId },
      order: { createdAt: 'ASC' },
    });
  }

  async get(workspaceId: string, idOrKey: string) {
    const byId = await this.repo.findOne({ where: { workspaceId, id: idOrKey } });
    if (byId) return byId;

    const byKey = await this.repo.findOne({ where: { workspaceId, key: idOrKey } });
    if (byKey) return byKey;

    throw new NotFoundException('Work item not found');
  }

  async update(workspaceId: string, workItemId: string, dto: UpdateWorkItemSimpleDto) {
    const item = await this.repo.findOne({ where: { workspaceId, id: workItemId } });
    if (!item) throw new NotFoundException('Work item not found');

    Object.assign(item, {
      dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : item.dueDate,
      status: dto.status ?? item.status,
      title: dto.title !== undefined ? dto.title.trim() : item.title,
      description: dto.description !== undefined ? (dto.description?.trim() || null) : item.description,
    });

    return this.repo.save(item);
  }

  async remove(workspaceId: string, workItemId: string) {
    const res = await this.repo.delete({ workspaceId, id: workItemId });
    return { deleted: res.affected === 1 };
  }
}
