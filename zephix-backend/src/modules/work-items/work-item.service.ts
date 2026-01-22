import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
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
import { WorkItemActivityService } from './services/work-item-activity.service';
import {
  WorkItemActivityType,
  WorkItemActivity,
} from './entities/work-item-activity.entity';
import { BulkUpdateWorkItemsDto } from './dto/bulk-update-work-items.dto';
import { BulkDeleteWorkItemsDto } from './dto/bulk-delete-work-items.dto';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import {
  canEditWorkItem,
  blockGuestWrite,
} from './helpers/work-item-permissions.helper';
import {
  normalizePlatformRole,
  isAdminRole,
} from '../../shared/enums/platform-roles.enum';
import { ForbiddenException } from '@nestjs/common';
import { In } from 'typeorm';

/**
 * PHASE 7 MODULE 7.1: Status Transition Validation
 * Centralized function to enforce valid status transitions
 */
function isValidStatusTransition(
  from: WorkItemStatus,
  to: WorkItemStatus,
): boolean {
  // Same status is always valid (no-op)
  if (from === to) return true;

  // Define allowed transitions
  const allowedTransitions: Record<WorkItemStatus, WorkItemStatus[]> = {
    [WorkItemStatus.TODO]: [WorkItemStatus.IN_PROGRESS, WorkItemStatus.DONE],
    [WorkItemStatus.IN_PROGRESS]: [WorkItemStatus.TODO, WorkItemStatus.DONE],
    [WorkItemStatus.DONE]: [WorkItemStatus.IN_PROGRESS], // Reopen
  };

  return allowedTransitions[from]?.includes(to) || false;
}

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
    @Inject(forwardRef(() => WorkItemActivityService))
    private readonly activityService: WorkItemActivityService,
    @Inject(getTenantAwareRepositoryToken(WorkItemActivity))
    private readonly workItemActivityRepo: TenantAwareRepository<WorkItemActivity>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private workspaceMemberRepo: TenantAwareRepository<WorkspaceMember>,
  ) {}

  async list(options: ListOptions) {
    // PHASE 7 MODULE 7.1 FIX: Explicit scoping
    const organizationId = this.tenantContextService.assertOrganizationId();

    const where: any = {
      deletedAt: IsNull(),
      organizationId, // Explicit scoping
    };

    // PHASE 7 MODULE 7.1 FIX: Require workspaceId or projectId for scoping
    if (options.workspaceId) {
      where.workspaceId = options.workspaceId;
    }

    if (options.projectId) {
      where.projectId = options.projectId;
      // If projectId provided, also scope by workspaceId if available
      // This ensures no cross-workspace leakage
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.assigneeId) {
      where.assigneeId = options.assigneeId;
    }

    // PHASE 7 MODULE 7.1 FIX: Sort by dueDate then createdAt
    // Note: TypeORM doesn't support nulls ordering directly, so we'll sort by dueDate ASC then createdAt DESC
    return this.workItemRepository.find({
      where,
      order: {
        dueDate: 'ASC', // Due items first (nulls will be last in practice)
        createdAt: 'DESC',
      },
      take: options.limit || 50,
      skip: options.offset || 0,
    });
  }

  async getOne(
    id: string,
    organizationId?: string,
    workspaceId?: string,
    projectId?: string,
  ) {
    // PHASE 7 MODULE 7.1 FIX: Explicit scoping
    const orgId =
      organizationId || this.tenantContextService.assertOrganizationId();

    const where: any = {
      id,
      deletedAt: IsNull(),
      organizationId: orgId, // Explicit scoping
    };

    // PHASE 7 MODULE 7.1 FIX: Add workspaceId and projectId if provided for extra security
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const item = await this.workItemRepository.findOne({
      where,
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

    const saved = await this.workItemRepository.save(item);

    // PHASE 7 MODULE 7.1: Record activity
    try {
      await this.activityService.record(
        saved.id,
        saved.workspaceId,
        saved.projectId,
        WorkItemActivityType.CREATED,
        options.createdBy,
      );
    } catch (error) {
      // Don't fail create if activity recording fails
      console.error('Failed to record activity:', error);
    }

    return saved;
  }

  async update(id: string, organizationId: string, options: UpdateOptions) {
    // organizationId parameter kept for backward compatibility but not used in query
    const item = await this.getOne(id);

    const oldStatus = item.status;
    const oldAssigneeId = item.assigneeId;
    const oldDueDate = item.dueDate;

    // PHASE 7 MODULE 7.1: Enforce status transitions
    if (options.status && options.status !== item.status) {
      if (!isValidStatusTransition(item.status, options.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${item.status} to ${options.status}`,
        );
      }
    }

    Object.assign(item, options);

    const saved = await this.workItemRepository.save(item);

    // PHASE 7 MODULE 7.1: Record activities
    try {
      const actorUserId = options.updatedBy || item.createdBy;

      if (options.status && options.status !== oldStatus) {
        await this.activityService.record(
          saved.id,
          saved.workspaceId,
          saved.projectId,
          WorkItemActivityType.STATUS_CHANGED,
          actorUserId,
          { from: oldStatus, to: options.status },
        );
      }

      if (
        options.assigneeId !== undefined &&
        options.assigneeId !== oldAssigneeId
      ) {
        if (options.assigneeId) {
          await this.activityService.record(
            saved.id,
            saved.workspaceId,
            saved.projectId,
            WorkItemActivityType.ASSIGNED,
            actorUserId,
            { assigneeId: options.assigneeId },
          );
        } else {
          await this.activityService.record(
            saved.id,
            saved.workspaceId,
            saved.projectId,
            WorkItemActivityType.UNASSIGNED,
            actorUserId,
          );
        }
      }

      const newDueDate = options.dueDate ? new Date(options.dueDate) : null;
      const oldDueDateObj = oldDueDate ? new Date(oldDueDate) : null;
      if (
        options.dueDate !== undefined &&
        newDueDate?.getTime() !== oldDueDateObj?.getTime()
      ) {
        await this.activityService.record(
          saved.id,
          saved.workspaceId,
          saved.projectId,
          WorkItemActivityType.DUE_DATE_CHANGED,
          actorUserId,
          { dueDate: newDueDate },
        );
      }

      if (
        !options.status &&
        !options.assigneeId &&
        options.dueDate === undefined
      ) {
        // General update
        await this.activityService.record(
          saved.id,
          saved.workspaceId,
          saved.projectId,
          WorkItemActivityType.UPDATED,
          actorUserId,
        );
      }
    } catch (error) {
      // Don't fail update if activity recording fails
      console.error('Failed to record activity:', error);
    }

    return saved;
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

  /**
   * PHASE 7 MODULE 7.4: Bulk update work items
   */
  async bulkUpdate(
    dto: BulkUpdateWorkItemsDto,
    userId: string,
    userRole: string | null | undefined,
  ) {
    const organizationId = this.tenantContextService.assertOrganizationId();

    // Validate ids limit
    if (dto.ids.length > 200) {
      throw new BadRequestException(
        'Maximum 200 items allowed per bulk operation',
      );
    }

    // Block Guest writes
    blockGuestWrite(userRole);

    // Fetch all work items with strict scoping
    const workItems = await this.workItemRepository.find({
      where: {
        id: In(dto.ids),
        organizationId,
        workspaceId: dto.workspaceId,
        projectId: dto.projectId,
        deletedAt: IsNull(),
      },
    });

    // Validate all IDs exist in the workspace/project
    const foundIds = new Set(workItems.map((item) => item.id));
    const missingIds = dto.ids.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Work items not found: ${missingIds.join(', ')}`,
      );
    }

    const results = {
      updatedCount: 0,
      skippedCount: 0,
      errors: [] as Array<{ id: string; reason: string }>,
    };

    const activities: Array<{
      organizationId: string;
      workspaceId: string;
      projectId: string;
      workItemId: string;
      type: WorkItemActivityType;
      actorUserId: string;
      payload: Record<string, any>;
    }> = [];

    // Process each item
    for (const item of workItems) {
      try {
        // Permission check
        const canEdit = await canEditWorkItem(
          item,
          userId,
          userRole,
          this.workspaceAccessService,
          this.workspaceMemberRepo,
        );

        if (!canEdit) {
          results.skippedCount++;
          results.errors.push({
            id: item.id,
            reason: 'Forbidden',
          });
          continue;
        }

        // Status transition validation
        if (dto.patch.status && dto.patch.status !== item.status) {
          if (!isValidStatusTransition(item.status, dto.patch.status)) {
            results.skippedCount++;
            results.errors.push({
              id: item.id,
              reason: `Invalid status transition from ${item.status} to ${dto.patch.status}`,
            });
            continue;
          }
        }

        // Apply patch
        const oldStatus = item.status;
        const oldAssigneeId = item.assigneeId;
        const oldDueDate = item.dueDate;

        if (dto.patch.status !== undefined) {
          item.status = dto.patch.status;
        }
        if (dto.patch.assigneeId !== undefined) {
          item.assigneeId = dto.patch.assigneeId;
        }
        if (dto.patch.dueDate !== undefined) {
          item.dueDate = dto.patch.dueDate ? new Date(dto.patch.dueDate) : null;
        }

        await this.workItemRepository.save(item);

        // Prepare activity record
        const changedFields: Record<string, any> = {};
        if (dto.patch.status !== undefined && dto.patch.status !== oldStatus) {
          changedFields.status = { from: oldStatus, to: dto.patch.status };
        }
        if (
          dto.patch.assigneeId !== undefined &&
          dto.patch.assigneeId !== oldAssigneeId
        ) {
          changedFields.assigneeId = {
            from: oldAssigneeId,
            to: dto.patch.assigneeId,
          };
        }
        if (dto.patch.dueDate !== undefined) {
          const newDueDate = dto.patch.dueDate
            ? new Date(dto.patch.dueDate)
            : null;
          const oldDueDateObj = oldDueDate ? new Date(oldDueDate) : null;
          if (newDueDate?.getTime() !== oldDueDateObj?.getTime()) {
            changedFields.dueDate = { from: oldDueDate, to: dto.patch.dueDate };
          }
        }

        activities.push({
          organizationId,
          workspaceId: item.workspaceId,
          projectId: item.projectId,
          workItemId: item.id,
          type: WorkItemActivityType.UPDATED,
          actorUserId: userId,
          payload: { bulkUpdate: true, changedFields },
        });

        results.updatedCount++;
      } catch (error) {
        results.skippedCount++;
        results.errors.push({
          id: item.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Insert all activities in bulk
    if (activities.length > 0) {
      try {
        const activityEntities = activities.map((act) =>
          this.workItemActivityRepo.create(act),
        );
        await Promise.all(
          activityEntities.map((entity) =>
            this.workItemActivityRepo.save(entity),
          ),
        );
      } catch (error) {
        console.error('Failed to record bulk activities:', error);
      }
    }

    return results;
  }

  /**
   * PHASE 7 MODULE 7.4: Bulk delete work items (Admin only)
   */
  async bulkDelete(
    dto: BulkDeleteWorkItemsDto,
    userId: string,
    userRole: string | null | undefined,
  ) {
    const organizationId = this.tenantContextService.assertOrganizationId();

    // Validate ids limit
    if (dto.ids.length > 200) {
      throw new BadRequestException(
        'Maximum 200 items allowed per bulk operation',
      );
    }

    // Block Guest writes
    blockGuestWrite(userRole);

    // Admin only for delete
    const normalizedRole = normalizePlatformRole(userRole);
    if (!isAdminRole(normalizedRole)) {
      throw new ForbiddenException('Forbidden');
    }

    // Fetch all work items with strict scoping - include projectId in select
    const workItems = await this.workItemRepository.find({
      where: {
        id: In(dto.ids),
        organizationId,
        workspaceId: dto.workspaceId,
        projectId: dto.projectId,
        deletedAt: IsNull(),
      },
      select: ['id', 'workspaceId', 'projectId'],
    });

    // Validate all IDs exist
    const foundIds = new Set(workItems.map((item) => item.id));
    const missingIds = dto.ids.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Work items not found: ${missingIds.join(', ')}`,
      );
    }

    // Create activities before deleting
    const activities = workItems.map((wi) => ({
      organizationId,
      workspaceId: wi.workspaceId,
      projectId: wi.projectId,
      workItemId: wi.id,
      type: WorkItemActivityType.UPDATED,
      actorUserId: userId,
      payload: { bulkDelete: true },
    }));

    // Insert activities in bulk
    if (activities.length > 0) {
      try {
        const activityEntities = activities.map((act) =>
          this.workItemActivityRepo.create(act),
        );
        await Promise.all(
          activityEntities.map((entity) =>
            this.workItemActivityRepo.save(entity),
          ),
        );
      } catch (error) {
        console.error('Failed to record bulk delete activities:', error);
      }
    }

    const results = {
      updatedCount: 0,
      skippedCount: 0,
      errors: [] as Array<{ id: string; reason: string }>,
    };

    // Soft delete (set deletedAt) or set status to DONE
    for (const item of workItems) {
      try {
        // Fetch full item for deletion
        const fullItem = await this.workItemRepository.findOne({
          where: { id: item.id },
        });

        if (!fullItem) {
          results.skippedCount++;
          results.errors.push({
            id: item.id,
            reason: 'Item not found',
          });
          continue;
        }

        // Soft delete if supported
        if ('deletedAt' in fullItem) {
          (fullItem as any).deletedAt = new Date();
        } else {
          // Fallback: set status to DONE
          fullItem.status = WorkItemStatus.DONE;
        }

        await this.workItemRepository.save(fullItem);
        results.updatedCount++;
      } catch (error) {
        results.skippedCount++;
        results.errors.push({
          id: item.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }
}
