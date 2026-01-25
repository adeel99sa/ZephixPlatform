import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { WorkspaceRole } from '../entities/workspace.entity';
import { User } from '../../users/entities/user.entity';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { Inject } from '@nestjs/common';

type MemberRow = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'member' | 'viewer';
  createdAt: Date;
};

// Map simple role names to WorkspaceRole
function mapToWorkspaceRole(
  role: 'owner' | 'member' | 'viewer',
): WorkspaceRole {
  switch (role) {
    case 'owner':
      return 'workspace_owner';
    case 'member':
      return 'workspace_member';
    case 'viewer':
      return 'workspace_viewer';
    default:
      throw new BadRequestException(`Invalid role: ${role}`);
  }
}

// Map WorkspaceRole back to simple role names
function mapFromWorkspaceRole(
  role: WorkspaceRole,
): 'owner' | 'member' | 'viewer' {
  if (role === 'workspace_owner') return 'owner';
  if (role === 'workspace_member') return 'member';
  if (role === 'workspace_viewer') return 'viewer';
  // Project-scoped roles shouldn't appear in workspace membership
  throw new BadRequestException(`Invalid workspace role: ${role}`);
}

@Injectable()
export class AdminWorkspaceMembersService {
  constructor(
    private readonly tenantContext: TenantContextService,
    @Inject(getTenantAwareRepositoryToken(Workspace))
    private readonly workspaceRepo: TenantAwareRepository<Workspace>,
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private readonly memberRepo: TenantAwareRepository<WorkspaceMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async assertWorkspaceInOrg(workspaceId: string, orgId: string) {
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId, deletedAt: IsNull() } as any,
      select: ['id', 'organizationId', 'deletedAt'],
    });
    if (!ws) throw new NotFoundException('Workspace not found.');
    if (ws.organizationId !== orgId) {
      throw new NotFoundException('Workspace not found.');
    }
    return ws;
  }

  async list(workspaceId: string): Promise<MemberRow[]> {
    const orgId = this.tenantContext.assertOrganizationId();
    await this.assertWorkspaceInOrg(workspaceId, orgId);

    const rows = await this.memberRepo
      .qb('m')
      .innerJoin('users', 'u', 'u.id = m.user_id')
      .select([
        'm.id AS id',
        'm.user_id AS "userId"',
        'm.role AS role',
        'm.created_at AS "createdAt"',
        'u.email AS email',
        'u.first_name AS "firstName"',
        'u.last_name AS "lastName"',
      ])
      .where('m.workspace_id = :workspaceId', { workspaceId })
      .orderBy('m.created_at', 'DESC')
      .getRawMany();

    return (rows || []).map((r: any) => ({
      id: r.id,
      userId: r.userId,
      email: r.email || '',
      name:
        `${r.firstName || ''} ${r.lastName || ''}`.trim() ||
        r.email ||
        'Unknown',
      role: mapFromWorkspaceRole(r.role as WorkspaceRole),
      createdAt: r.createdAt,
    }));
  }

  async add(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'member' | 'viewer',
  ) {
    const orgId = this.tenantContext.assertOrganizationId();
    await this.assertWorkspaceInOrg(workspaceId, orgId);

    const user = await this.userRepo.findOne({
      where: { id: userId } as any,
      select: ['id', 'organizationId'],
    });
    if (!user) throw new BadRequestException('User not found.');
    if (user.organizationId !== orgId) {
      throw new BadRequestException('User not found.');
    }

    const exists = await this.memberRepo.findOne({
      where: { workspaceId, userId } as any,
      select: ['id'],
    });
    if (exists) throw new BadRequestException('User already in workspace.');

    const workspaceRole = mapToWorkspaceRole(role);
    const created = await this.memberRepo.save(
      this.memberRepo.create({ workspaceId, userId, role: workspaceRole }),
    );

    return { id: created.id };
  }

  async updateRole(
    workspaceId: string,
    memberId: string,
    role: 'owner' | 'member' | 'viewer',
  ) {
    const orgId = this.tenantContext.assertOrganizationId();
    await this.assertWorkspaceInOrg(workspaceId, orgId);

    const member = await this.memberRepo.findOne({
      where: { id: memberId, workspaceId } as any,
      select: ['id'],
    });
    if (!member) throw new NotFoundException('Member not found.');

    const workspaceRole = mapToWorkspaceRole(role);
    await this.memberRepo.update(
      { id: memberId, workspaceId } as any,
      { role: workspaceRole } as any,
    );
    return { success: true as const };
  }

  async remove(workspaceId: string, memberId: string) {
    const orgId = this.tenantContext.assertOrganizationId();
    await this.assertWorkspaceInOrg(workspaceId, orgId);

    const member = await this.memberRepo.findOne({
      where: { id: memberId, workspaceId } as any,
      select: ['id'],
    });
    if (!member) throw new NotFoundException('Member not found.');

    await this.memberRepo.delete({ id: memberId, workspaceId } as any);
    return { success: true as const };
  }
}
