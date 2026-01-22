import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkItemComment } from '../entities/work-item-comment.entity';
import { WorkItem } from '../entities/work-item.entity';
import { CreateWorkItemCommentDto } from '../dto/create-work-item-comment.dto';
import {
  WorkItemActivity,
  WorkItemActivityType,
} from '../entities/work-item-activity.entity';

@Injectable()
export class WorkItemCommentService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkItemComment))
    private commentRepository: TenantAwareRepository<WorkItemComment>,
    @Inject(getTenantAwareRepositoryToken(WorkItem))
    private workItemRepository: TenantAwareRepository<WorkItem>,
    @Inject(getTenantAwareRepositoryToken(WorkItemActivity))
    private activityRepository: TenantAwareRepository<WorkItemActivity>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async create(
    workItemId: string,
    workspaceId: string,
    dto: CreateWorkItemCommentDto,
    userId: string,
  ): Promise<WorkItemComment> {
    const organizationId = this.tenantContextService.assertOrganizationId();

    // PHASE 7 MODULE 7.1 FIX: Verify work item exists with proper scoping
    const workItem = await this.workItemRepository.findOne({
      where: {
        id: workItemId,
        workspaceId,
        organizationId, // Explicit scoping
        deletedAt: null,
      },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found');
    }

    // PHASE 7 MODULE 7.1 FIX: Store projectId for integrity
    const comment = this.commentRepository.create({
      organizationId,
      workspaceId,
      projectId: workItem.projectId, // Store projectId
      workItemId,
      body: dto.body,
      createdBy: userId,
    });

    const saved = await this.commentRepository.save(comment);

    // Record activity
    await this.activityRepository.save(
      this.activityRepository.create({
        organizationId,
        workspaceId,
        workItemId,
        type: WorkItemActivityType.COMMENT_ADDED,
        actorUserId: userId,
        payload: { commentId: saved.id },
      }),
    );

    return saved;
  }

  async list(
    workItemId: string,
    workspaceId: string,
  ): Promise<WorkItemComment[]> {
    const organizationId = this.tenantContextService.assertOrganizationId();

    // PHASE 7 MODULE 7.1 FIX: Explicit scoping
    return this.commentRepository.find({
      where: {
        workItemId,
        workspaceId,
        organizationId, // Explicit scoping
      },
      order: { createdAt: 'ASC' },
      relations: ['createdByUser'],
    });
  }
}
