import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { WorkResourceAllocation } from '../entities/work-resource-allocation.entity';
import {
  CreateWorkResourceAllocationDto,
  UpdateWorkResourceAllocationDto,
  ListWorkResourceAllocationsQueryDto,
} from '../dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class WorkResourceAllocationsService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkResourceAllocation))
    private readonly allocationRepo: TenantAwareRepository<WorkResourceAllocation>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepository: Repository<WorkspaceMember>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ============================================================
  // WORKSPACE SCOPE HELPERS
  // ============================================================

  private async assertWorkspaceAccess(
    auth: AuthContext,
    workspaceId: string | undefined | null,
  ): Promise<string> {
    if (!workspaceId) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace ID is required. Include x-workspace-id header.',
      });
    }

    const organizationId = this.tenantContext.assertOrganizationId();
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      auth.userId,
      auth.platformRole,
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Access denied to workspace',
      });
    }

    return workspaceId;
  }

  private async assertWriteAccess(
    auth: AuthContext,
    workspaceId: string,
  ): Promise<void> {
    if (auth.platformRole === 'ADMIN') {
      return;
    }
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );
  }

  private async assertAdminAccess(auth: AuthContext): Promise<void> {
    if (auth.platformRole !== 'ADMIN') {
      throw new ForbiddenException({
        code: 'ADMIN_REQUIRED',
        message: 'Admin access required for this operation',
      });
    }
  }

  // ============================================================
  // LIST ALLOCATIONS
  // ============================================================

  async listAllocations(
    auth: AuthContext,
    workspaceId: string,
    query: ListWorkResourceAllocationsQueryDto,
  ): Promise<{ items: WorkResourceAllocation[]; total: number }> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    const qb = this.allocationRepo
      .createQueryBuilder('allocation')
      .where('allocation.organizationId = :organizationId', { organizationId })
      .andWhere('allocation.workspaceId = :workspaceId', { workspaceId })
      .andWhere('allocation.projectId = :projectId', {
        projectId: query.projectId,
      })
      .andWhere('allocation.deletedAt IS NULL')
      .orderBy('allocation.updatedAt', 'DESC');

    const [items, total] = await qb.getManyAndCount();

    return { items, total };
  }

  // ============================================================
  // CREATE ALLOCATION
  // ============================================================

  async createAllocation(
    auth: AuthContext,
    workspaceId: string,
    dto: CreateWorkResourceAllocationDto,
  ): Promise<WorkResourceAllocation> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    await this.assertWriteAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    // Verify project exists in this workspace
    const project = await this.projectRepository.findOne({
      where: {
        id: dto.projectId,
        workspaceId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found in this workspace',
      });
    }

    // Verify user is a member of this workspace
    const member = await this.memberRepository.findOne({
      where: {
        workspaceId,
        userId: dto.userId,
      },
    });

    if (!member) {
      throw new NotFoundException({
        code: 'USER_NOT_WORKSPACE_MEMBER',
        message: 'User is not a member of this workspace',
      });
    }

    // Check for existing allocation (unique constraint)
    const existing = await this.allocationRepo.findOne({
      where: {
        organizationId,
        workspaceId,
        projectId: dto.projectId,
        userId: dto.userId,
        deletedAt: IsNull(),
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'ALLOCATION_EXISTS',
        message: 'User already has an allocation for this project',
      });
    }

    const allocation = this.allocationRepo.create({
      organizationId,
      workspaceId,
      projectId: dto.projectId,
      userId: dto.userId,
      allocationPercent: dto.allocationPercent ?? 100,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });

    return this.allocationRepo.save(allocation);
  }

  // ============================================================
  // UPDATE ALLOCATION
  // ============================================================

  async updateAllocation(
    auth: AuthContext,
    workspaceId: string,
    allocationId: string,
    dto: UpdateWorkResourceAllocationDto,
  ): Promise<WorkResourceAllocation> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    await this.assertWriteAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    const allocation = await this.allocationRepo.findOne({
      where: {
        id: allocationId,
        organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });

    if (!allocation) {
      throw new NotFoundException({
        code: 'ALLOCATION_NOT_FOUND',
        message: 'Allocation not found',
      });
    }

    if (dto.allocationPercent !== undefined) {
      allocation.allocationPercent = dto.allocationPercent;
    }
    if (dto.startDate !== undefined) {
      allocation.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      allocation.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    return this.allocationRepo.save(allocation);
  }

  // ============================================================
  // DELETE ALLOCATION (Admin only)
  // ============================================================

  async deleteAllocation(
    auth: AuthContext,
    workspaceId: string,
    allocationId: string,
  ): Promise<void> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    await this.assertAdminAccess(auth);
    const organizationId = this.tenantContext.assertOrganizationId();

    const allocation = await this.allocationRepo.findOne({
      where: {
        id: allocationId,
        organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });

    if (!allocation) {
      throw new NotFoundException({
        code: 'ALLOCATION_NOT_FOUND',
        message: 'Allocation not found',
      });
    }

    // Hard delete for MVP simplicity
    await this.allocationRepo.remove(allocation);
  }

  // ============================================================
  // GET ALLOCATION BY ID
  // ============================================================

  async getAllocationById(
    auth: AuthContext,
    workspaceId: string,
    allocationId: string,
  ): Promise<WorkResourceAllocation> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    const allocation = await this.allocationRepo.findOne({
      where: {
        id: allocationId,
        organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });

    if (!allocation) {
      throw new NotFoundException({
        code: 'ALLOCATION_NOT_FOUND',
        message: 'Allocation not found',
      });
    }

    return allocation;
  }
}
