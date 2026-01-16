/**
 * PHASE 7 MODULE 7.2: My Work Service
 * Returns assigned work tasks for the current user across accessible workspaces
 * Updated to use WorkTask entity instead of WorkItem
 */
import { Injectable, Inject } from '@nestjs/common';
import { In } from 'typeorm';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { TaskStatus } from '../../work-management/enums/task.enums';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { MyWorkResponseDto, MyWorkItemDto } from '../dto/my-work-response.dto';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../../shared/enums/platform-roles.enum';

@Injectable()
export class MyWorkService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private workTaskRepository: TenantAwareRepository<WorkTask>,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getMyWork(
    userId: string,
    userRole: string | null | undefined,
  ): Promise<MyWorkResponseDto> {
    const organizationId = this.tenantContextService.assertOrganizationId();

    // Get accessible workspace IDs
    const accessibleWorkspaceIds =
      await this.workspaceAccessService.getAccessibleWorkspaceIds(
        organizationId,
        userId,
        userRole,
      );

    // If no accessible workspaces, return empty
    if (
      accessibleWorkspaceIds !== null &&
      accessibleWorkspaceIds.length === 0
    ) {
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
      assigneeUserId: userId,
    };

    // Scope by accessible workspaces
    if (accessibleWorkspaceIds !== null) {
      where.workspaceId = In(accessibleWorkspaceIds);
    }

    // Get all work tasks for user
    const workTasks = await this.workTaskRepository.find({
      where,
      relations: ['project', 'project.workspace'],
      take: 200, // Default limit
    });

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Helper to map TaskStatus enum to response format
    const mapStatus = (status: TaskStatus): string => {
      switch (status) {
        case TaskStatus.DONE:
        case TaskStatus.CANCELED:
          return 'done';
        case TaskStatus.IN_PROGRESS:
        case TaskStatus.IN_REVIEW:
        case TaskStatus.BLOCKED:
          return 'in_progress';
        case TaskStatus.TODO:
        case TaskStatus.BACKLOG:
        default:
          return 'todo';
      }
    };

    // Helper to check if status is "done" for filtering
    const isDoneStatus = (status: TaskStatus): boolean => {
      return status === TaskStatus.DONE || status === TaskStatus.CANCELED;
    };

    // Calculate counts
    let overdue = 0;
    let dueSoon7Days = 0;
    let inProgress = 0;
    let todo = 0;
    let done = 0;

    const items: MyWorkItemDto[] = [];

    for (const task of workTasks) {
      const mappedStatus = mapStatus(task.status);

      // Count by status
      if (mappedStatus === 'done') {
        done++;
      } else if (mappedStatus === 'in_progress') {
        inProgress++;
      } else if (mappedStatus === 'todo') {
        todo++;
      }

      // Check overdue (dueDate < now AND status != DONE)
      const isOverdue =
        task.dueDate &&
        new Date(task.dueDate) < now &&
        !isDoneStatus(task.status);

      if (isOverdue) {
        overdue++;
      }

      // Check due soon (dueDate within 7 days AND status != DONE)
      if (
        task.dueDate &&
        new Date(task.dueDate) >= now &&
        new Date(task.dueDate) <= sevenDaysFromNow &&
        !isDoneStatus(task.status)
      ) {
        dueSoon7Days++;
      }

      // Build item DTO
      items.push({
        id: task.id,
        title: task.title,
        status: mappedStatus,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        updatedAt: task.updatedAt.toISOString(),
        projectId: task.projectId,
        projectName: task.project?.name || 'Unknown Project',
        workspaceId: task.workspaceId,
        workspaceName: task.project?.workspace?.name || 'Unknown Workspace',
      });
    }

    // Sort: overdue first, then dueDate asc, then updatedAt desc
    items.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate) : null;
      const bDue = b.dueDate ? new Date(b.dueDate) : null;

      const aOverdue = aDue && aDue < now && a.status !== 'done';
      const bOverdue = bDue && bDue < now && b.status !== 'done';

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
