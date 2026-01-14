import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ListTeamsQueryDto } from './dto/list-teams-query.dto';
import { TeamVisibility } from '../../shared/enums/team-visibility.enum';
import { TeamMemberRole } from '../../shared/enums/team-member-role.enum';
import { Project } from '../projects/entities/project.entity';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(Team))
    private readonly teamRepository: TenantAwareRepository<Team>,
    @Inject(getTenantAwareRepositoryToken(TeamMember))
    private readonly teamMemberRepository: TenantAwareRepository<TeamMember>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private readonly projectRepository: TenantAwareRepository<Project>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  /**
   * Generate a slug from team name
   */
  private generateSlug(name: string): string {
    return (
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10) || 'TEAM'
    );
  }

  /**
   * List teams for an organization with filters
   */
  async listTeams(
    organizationId: string,
    query: ListTeamsQueryDto,
  ): Promise<{ teams: Team[]; total: number }> {
    // organizationId parameter kept for backward compatibility
    const orgId = this.tenantContextService.assertOrganizationId();

    const {
      search,
      status = 'active',
      workspaceId,
      page = 1,
      limit = 20,
    } = query;

    // Use tenant-aware query builder - organizationId filter is automatic
    const queryBuilder = this.teamRepository.qb('team');

    // Filter by archived status
    if (status === 'archived') {
      queryBuilder.andWhere('team.isArchived = :isArchived', {
        isArchived: true,
      });
    } else {
      queryBuilder.andWhere('team.isArchived = :isArchived', {
        isArchived: false,
      });
    }

    // Filter by workspace (workspaceId filter is automatic if workspaceId is in context)
    // If workspaceId is provided in query, it will be validated by the interceptor
    // For now, we add it as an explicit filter if provided
    if (workspaceId) {
      queryBuilder.andWhere('team.workspaceId = :workspaceId', { workspaceId });
    }

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(team.name ILIKE :search OR team.slug ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const teams = await queryBuilder
      .orderBy('team.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Add member and project counts
    // TeamMember is tenant-scoped via Team relationship, so count is automatically scoped
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const [membersCount, projectsCount] = await Promise.all([
          this.teamMemberRepository.count({ where: { teamId: team.id } }),
          // TODO: Add teamId to Project entity when team assignment is implemented
          // For now, return 0
          Promise.resolve(0),
        ]);

        return {
          ...team,
          membersCount,
          projectsCount,
        };
      }),
    );

    return {
      teams: teamsWithCounts as any,
      total,
    };
  }

  /**
   * Get a single team by ID (org scoped)
   */
  async getTeamById(
    organizationId: string,
    teamId: string,
  ): Promise<Team & { membersCount: number; projectsCount: number }> {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['members', 'members.user'],
    });

    if (!team) {
      throw new NotFoundException(
        `Team with ID ${teamId} not found in organization`,
      );
    }

    // TeamMember is tenant-scoped via Team relationship, so count is automatically scoped
    const [membersCount, projectsCount] = await Promise.all([
      this.teamMemberRepository.count({ where: { teamId: team.id } }),
      // TODO: Add teamId to Project entity when team assignment is implemented
      Promise.resolve(0),
    ]);

    return {
      ...team,
      membersCount,
      projectsCount,
    } as any;
  }

  /**
   * Create a new team
   */
  async createTeam(
    organizationId: string,
    dto: CreateTeamDto,
    currentUserId: string,
  ): Promise<Team & { membersCount: number; projectsCount: number }> {
    // Generate slug if not provided (use shortCode if provided, otherwise generate)
    // Ensure slug is uppercase
    const slugInput = dto.slug || (dto as any).shortCode;
    const slug = slugInput
      ? slugInput
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 10)
      : this.generateSlug(dto.name);

    // Check for unique slug within organization
    // TenantAwareRepository automatically scopes by organizationId
    const existingTeam = await this.teamRepository.findOne({
      where: { slug },
    });

    if (existingTeam) {
      throw new BadRequestException(
        `Team with slug "${slug}" already exists in this organization`,
      );
    }

    // Validate workspace belongs to organization if provided
    if (dto.workspaceId) {
      // Note: Workspace validation should be done in controller or via a guard
      // For now, we'll trust the workspaceId is valid since AdminGuard ensures org access
    }

    // Create team
    // organizationId comes from tenant context
    const orgId = this.tenantContextService.assertOrganizationId();
    const team = this.teamRepository.create({
      organizationId: orgId,
      name: dto.name,
      slug,
      color: dto.color || null,
      visibility: dto.visibility,
      description: dto.description || null,
      workspaceId: dto.workspaceId || null,
      isArchived: false,
    });

    const savedTeam = await this.teamRepository.save(team);

    // Add creator as OWNER
    if (currentUserId) {
      const ownerMember = this.teamMemberRepository.create({
        teamId: savedTeam.id,
        userId: currentUserId,
        role: TeamMemberRole.OWNER,
      });
      await this.teamMemberRepository.save(ownerMember);
    }

    return this.getTeamById(organizationId, savedTeam.id);
  }

  /**
   * Update a team
   */
  async updateTeam(
    organizationId: string,
    teamId: string,
    dto: UpdateTeamDto,
  ): Promise<Team & { membersCount: number; projectsCount: number }> {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(
        `Team with ID ${teamId} not found in organization`,
      );
    }

    // Check slug uniqueness if changing
    // Handle both slug and shortCode (frontend sends shortCode)
    const slugInput = dto.slug || (dto as any).shortCode;
    if (slugInput) {
      const normalizedSlug = slugInput
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10);
      if (normalizedSlug !== team.slug) {
        // TenantAwareRepository automatically scopes by organizationId
        const existingTeam = await this.teamRepository.findOne({
          where: { slug: normalizedSlug },
        });

        if (existingTeam) {
          throw new BadRequestException(
            `Team with slug "${normalizedSlug}" already exists in this organization`,
          );
        }
        // Update slug if it changed
        team.slug = normalizedSlug;
      }
    }

    // Update fields
    if (dto.name !== undefined) team.name = dto.name;
    if (dto.color !== undefined) team.color = dto.color || null;
    if (dto.visibility !== undefined) team.visibility = dto.visibility;
    if (dto.description !== undefined)
      team.description = dto.description || null;
    if (dto.workspaceId !== undefined)
      team.workspaceId = dto.workspaceId || null;
    // Handle both isArchived and status (frontend sends status)
    if (dto.isArchived !== undefined) {
      team.isArchived = dto.isArchived;
    } else if ((dto as any).status !== undefined) {
      team.isArchived = (dto as any).status === 'archived';
    }

    await this.teamRepository.save(team);

    return this.getTeamById(organizationId, teamId);
  }

  /**
   * Delete (archive) a team
   */
  async deleteTeam(
    organizationId: string,
    teamId: string,
  ): Promise<Team & { membersCount: number; projectsCount: number }> {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(
        `Team with ID ${teamId} not found in organization`,
      );
    }

    // Soft delete by archiving
    team.isArchived = true;
    await this.teamRepository.save(team);

    return this.getTeamById(organizationId, teamId);
  }
}
