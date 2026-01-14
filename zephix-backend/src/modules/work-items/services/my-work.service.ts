/**
 * PHASE 7 MODULE 7.2: My Work Service
 * Returns assigned work items for the current user across accessible workspaces
 */
import { Injectable, Inject } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkItem, WorkItemStatus } from '../entities/work-item.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { MyWorkResponseDto, MyWorkItemDto } from '../dto/my-work-response.dto';
import { normalizePlatformRole, PlatformRole } from '../../../shared/enums/platform-roles.enum';

@Injectable()
export class MyWorkService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkItem))
    private workItemRepository: TenantAwareRepository<WorkItem>,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getMyWork(
    userId: string,
    userRole: string | null | undefined,
  ): Promise<MyWorkResponseDto> {
    const organizationId = this.tenantContextService.assertOrganizationId();

    // Get accessible workspace IDs
    const accessibleWorkspaceIds = await this.workspaceAccessService.getAccessibleWorkspaceIds(
      organizationId,
      userId,
      userRole,
    );

    // If no accessible workspaces, return empty
    if (accessibleWorkspaceIds !== null && accessibleWorkspaceIds.length === 0) {
      return {
        version: 1,
        counts: {
          total: 0,
          overdue: 0,
          dueSoon7Days: 0,
          inProgress: 0,
          todo: 0,
          done: 0,
        },
        items: [],
      };
    }

    // Build where clause
    const where: any = {
      organizationId,
      assigneeId: userId,
      deletedAt: IsNull(),
    };

    // Scope by accessible workspaces
    if (accessibleWorkspaceIds !== null) {
      where.workspaceId = In(accessibleWorkspaceIds);
    }

    // Get all work items for user
    const workItems = await this.workItemRepository.find({
      where,
      relations: ['project', 'workspace'],
      take: 200, // Default limit
    });

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Calculate counts
    let overdue = 0;
    let dueSoon7Days = 0;
    let inProgress = 0;
    let todo = 0;
    let done = 0;

    const items: MyWorkItemDto[] = [];

    for (const item of workItems) {
      // Count by status
      if (item.status === WorkItemStatus.DONE) {
        done++;
      } else if (item.status === WorkItemStatus.IN_PROGRESS) {
        inProgress++;
      } else if (item.status === WorkItemStatus.TODO) {
        todo++;
      }

      // Check overdue (dueDate < now AND status != DONE)
      const isOverdue = item.dueDate &&
        new Date(item.dueDate) < now &&
        item.status !== WorkItemStatus.DONE;

      if (isOverdue) {
        overdue++;
      }

      // Check due soon (dueDate within 7 days AND status != DONE)
      if (item.dueDate &&
          new Date(item.dueDate) >= now &&
          new Date(item.dueDate) <= sevenDaysFromNow &&
          item.status !== WorkItemStatus.DONE) {
        dueSoon7Days++;
      }

      // Build item DTO
      items.push({
        id: item.id,
        title: item.title,
        status: item.status,
        dueDate: item.dueDate ? item.dueDate.toISOString() : null,
        updatedAt: item.updatedAt.toISOString(),
        projectId: item.projectId,
        projectName: item.project?.name || 'Unknown Project',
        workspaceId: item.workspaceId,
        workspaceName: item.workspace?.name || 'Unknown Workspace',
      });
    }

    // Sort: overdue first, then dueDate asc, then updatedAt desc
    items.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate) : null;
      const bDue = b.dueDate ? new Date(b.dueDate) : null;

      const aOverdue = aDue && aDue < now && a.status !== WorkItemStatus.DONE;
      const bOverdue = bDue && bDue < now && b.status !== WorkItemStatus.DONE;

      // Overdue items first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by dueDate (ascending, nulls last)
      if (aDue && bDue) {
        return aDue.getTime() - bDue.getTime();
      }
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;

      // Finally by updatedAt (descending)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return {
      version: 1,
      counts: {
        total: items.length,
        overdue,
        dueSoon7Days,
        inProgress,
        todo,
        done,
      },
      items,
    };
  }
}
