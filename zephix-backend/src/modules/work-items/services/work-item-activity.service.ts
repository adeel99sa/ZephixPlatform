import { Injectable, Inject } from '@nestjs/common';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkItemActivity } from '../entities/work-item-activity.entity';

@Injectable()
export class WorkItemActivityService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkItemActivity))
    private activityRepository: TenantAwareRepository<WorkItemActivity>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async record(
    workItemId: string,
    workspaceId: string,
    projectId: string,
    type: WorkItemActivity['type'],
    actorUserId: string,
    payload?: Record<string, any>,
  ): Promise<WorkItemActivity> {
    const organizationId = this.tenantContextService.assertOrganizationId();

    const activity = this.activityRepository.create({
      organizationId,
      workspaceId,
      workItemId,
      type,
      actorUserId,
      payload,
    });

    return this.activityRepository.save(activity);
  }

  async list(
    workItemId: string,
    workspaceId: string,
  ): Promise<WorkItemActivity[]> {
    const organizationId = this.tenantContextService.assertOrganizationId();

    // PHASE 7 MODULE 7.1 FIX: Explicit scoping
    return this.activityRepository.find({
      where: {
        workItemId,
        workspaceId,
        organizationId, // Explicit scoping
      },
      order: { createdAt: 'DESC' },
      relations: ['actorUser'],
      take: 50,
    });
  }
}
