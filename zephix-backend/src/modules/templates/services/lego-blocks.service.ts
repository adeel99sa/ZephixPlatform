import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Request } from 'express';

import { TenantContextService } from '../../tenancy/tenant-context.service';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';

import { LegoBlock } from '../entities/lego-block.entity';

type ListBlocksV1Params = {
  type?: string;
  category?: string;
  isActive?: boolean;
};

@Injectable()
export class LegoBlocksService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(LegoBlock))
    private readonly legoBlockRepo: TenantAwareRepository<LegoBlock>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getOrgId(req: Request): string {
    const user: any = (req as any).user;
    const orgId = user?.organizationId || user?.organization_id;
    return orgId || this.tenantContext.assertOrganizationId();
  }

  private roleRank(role?: string): number {
    const r = String(role || '').toUpperCase();
    if (r === 'OWNER') return 4;
    if (r === 'ADMIN') return 3;
    if (r === 'PM' || r === 'PROJECT_MANAGER') return 2;
    if (r === 'USER' || r === 'MEMBER') return 1;
    return 0;
  }

  async listV1(req: Request, params: ListBlocksV1Params = {}) {
    const orgId = this.getOrgId(req);

    const qb = this.legoBlockRepo
      .createQueryBuilder('b')
      .where(
        '(b.isSystem = true AND b.organizationId IS NULL) OR b.organizationId = :orgId',
        {
          orgId,
        },
      );

    if (params.type) qb.andWhere('b.type = :type', { type: params.type });
    if (params.category)
      qb.andWhere('b.category = :category', { category: params.category });

    if (typeof params.isActive === 'boolean') {
      qb.andWhere('b.isActive = :isActive', { isActive: params.isActive });
    } else {
      qb.andWhere('b.isActive = true');
    }

    qb.orderBy('b.category', 'ASC').addOrderBy('b.name', 'ASC');

    return qb.getMany();
  }

  async getByIdForGuard(req: Request, blockId: string) {
    const orgId = this.getOrgId(req);

    const b = await this.legoBlockRepo.findOne({
      select: [
        'id',
        'minRoleToAttach',
        'isActive',
        'isSystem',
        'organizationId',
      ] as any,
      where: [
        { id: blockId, isSystem: true, organizationId: null } as any,
        { id: blockId, organizationId: orgId } as any,
      ],
    });

    if (!b) throw new NotFoundException('Block not found');
    return b;
  }

  async userMeetsMinRole(
    req: Request,
    block: Pick<LegoBlock, 'minRoleToAttach'>,
  ) {
    const user: any = (req as any).user;
    const userRole = user?.role || user?.orgRole || user?.organizationRole;
    const userRank = this.roleRank(userRole);

    const minRank = this.roleRank(block?.minRoleToAttach || 'USER');
    return userRank >= minRank;
  }

  assertUserMeetsMinRole(
    req: Request,
    block: Pick<LegoBlock, 'minRoleToAttach'>,
  ) {
    const ok = this.userMeetsMinRole(req, block);
    return Promise.resolve(ok).then((allowed) => {
      if (!allowed) throw new ForbiddenException('Insufficient role for block');
      return true;
    });
  }
}

