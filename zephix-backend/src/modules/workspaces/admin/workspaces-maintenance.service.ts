import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Workspace } from '../entities/workspace.entity';

type Candidate = {
  id: string;
  name: string;
  createdAt: Date;
};

const PATTERNS = ['demo', 'test', 'cursor', 'template proofs'];

function matches(name: string): boolean {
  const v = (name ?? '').toLowerCase();
  return PATTERNS.some((p) => v.includes(p));
}

@Injectable()
export class WorkspacesMaintenanceService {
  constructor(
    private readonly tenantContextService: TenantContextService,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
  ) {}

  async listCleanupCandidates(): Promise<Candidate[]> {
    const orgId = this.tenantContextService.assertOrganizationId();

    const rows = await this.workspaceRepo.find({
      where: { organizationId: orgId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    return (rows ?? [])
      .filter((w) => matches(w.name))
      .map((w) => ({ id: w.id, name: w.name, createdAt: w.createdAt }));
  }

  async cleanupTestWorkspaces(input: { dryRun: boolean; ids?: string[] }) {
    const orgId = this.tenantContextService.assertOrganizationId();

    const where: any = { organizationId: orgId, deletedAt: IsNull() };
    if (input.ids?.length) where.id = In(input.ids);

    const rows = await this.workspaceRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const candidates = (rows ?? []).filter((w) => matches(w.name));

    const matched = candidates.map((w) => ({
      id: w.id,
      name: w.name,
      createdAt: w.createdAt,
    }));

    if (input.dryRun) {
      return {
        orgId,
        dryRun: true,
        matchedCount: matched.length,
        matched,
        updatedCount: 0,
        updatedIds: [],
      };
    }

    if (matched.length === 0) {
      return {
        orgId,
        dryRun: false,
        matchedCount: 0,
        matched: [],
        updatedCount: 0,
        updatedIds: [],
      };
    }

    const ids = matched.map((m) => m.id);

    await this.workspaceRepo.update(
      { organizationId: orgId, id: In(ids), deletedAt: IsNull() },
      { deletedAt: new Date() },
    );

    return {
      orgId,
      dryRun: false,
      matchedCount: matched.length,
      matched,
      updatedCount: ids.length,
      updatedIds: ids,
    };
  }
}
