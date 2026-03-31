import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { OrganizationsService } from '../organizations/services/organizations.service';
import { WorkspacesService } from '../modules/workspaces/workspaces.service';
import { TeamsService } from '../modules/teams/teams.service';
import { AttachmentsService } from '../modules/attachments/services/attachments.service';
import { ListTeamsQueryDto } from '../modules/teams/dto/list-teams-query.dto';
import { AuthRequest } from '../common/http/auth-request';
import { getAuthContext } from '../common/http/get-auth-context';
import { AuditService } from '../modules/audit/services/audit.service';
import { toAuditEventDto } from '../modules/audit/dto/audit-event.dto';
import { WorkspaceMember } from '../modules/workspaces/entities/workspace-member.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Organization } from '../organizations/entities/organization.entity';
// TODO: Re-add UpdateOrganizationDto when PATCH organization/profile ships (Branch B)
// import { UpdateOrganizationDto } from '../organizations/dto/update-organization.dto';
import {
  EvaluationDecision,
  GovernanceEvaluation,
} from '../modules/governance-rules/entities/governance-evaluation.entity';
import { buildAccessControlSummaryContract } from './contracts/access-control-summary.contract';
import { buildAIGovernanceSummaryContract } from './contracts/ai-governance-summary.contract';
import { IntegrationConnection } from '../modules/integrations/entities/integration-connection.entity';
import { AuditEvent } from '../modules/audit/entities/audit-event.entity';
import { EntitlementService } from '../modules/billing/entitlements/entitlement.service';
// TODO: Re-add GovernanceModule imports after governance workstream merges
// import { GovernancePoliciesService } from '../modules/governance/services/governance-policies.service';

type AdminUserRow = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  isActive?: boolean | null;
  organizationId?: string | null;
  lastActive?: string | Date | null;
  joinedAt?: string | Date | null;
  lastLoginAt?: string | Date | null;
  createdAt?: string | Date | null;
};

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly organizationsService: OrganizationsService,
    private readonly workspacesService: WorkspacesService,
    private readonly teamsService: TeamsService,
    private readonly attachmentsService: AttachmentsService,
    private readonly entitlementService: EntitlementService,
    private readonly auditService: AuditService,
    // TODO: Re-add GovernancePoliciesService after governance workstream merges
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(GovernanceEvaluation)
    private readonly governanceEvaluationRepository: Repository<GovernanceEvaluation>,
    @InjectRepository(IntegrationConnection)
    private readonly integrationConnectionRepository: Repository<IntegrationConnection>,
    @InjectRepository(AuditEvent)
    private readonly auditEventRepository: Repository<AuditEvent>,
  ) {}

  private mapOrganizationProfile(organization: Organization) {
    const settings = (organization.settings || {}) as Record<string, any>;
    const identity = (settings.identity || {}) as Record<string, any>;
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      website: organization.website || null,
      industry: organization.industry || null,
      size: organization.size || null,
      description: organization.description || null,
      createdAt: organization.createdAt
        ? new Date(organization.createdAt).toISOString()
        : null,
      updatedAt: organization.updatedAt
        ? new Date(organization.updatedAt).toISOString()
        : null,
      planCode: organization.planCode || null,
      planStatus: organization.planStatus || null,
      planExpiresAt: organization.planExpiresAt
        ? new Date(organization.planExpiresAt).toISOString()
        : null,
      metadataSummary: {
        trialEndsAt: organization.trialEndsAt
          ? new Date(organization.trialEndsAt).toISOString()
          : null,
        dataRegion:
          (settings.dataRegion as string | undefined) ||
          (identity.dataRegion as string | undefined) ||
          null,
        allowedEmailDomain:
          (identity.allowedEmailDomain as string | undefined) || null,
      },
    };
  }

  private mapOrgRoleToPlatformRole(
    role?: string | null,
  ): 'owner' | 'admin' | 'member' | 'viewer' {
    if (role === 'owner') return 'owner';
    if (role === 'admin') return 'admin';
    if (role === 'viewer') return 'viewer';
    return 'member';
  }

  private mapWorkspaceRoleForAdminView(role?: string | null): string {
    if (role === 'workspace_owner') return 'workspace_owner';
    if (role === 'workspace_viewer') return 'viewer';
    if (role === 'delivery_owner') return 'delivery_owner';
    return 'contributor';
  }

  private inferExceptionStatus(row: GovernanceEvaluation): 'PENDING' | 'RESOLVED' {
    const snapshotStatus = (row.inputsSnapshot as any)?.exceptionWorkflow?.status;
    if (snapshotStatus === 'APPROVED' || snapshotStatus === 'REJECTED') {
      return 'RESOLVED';
    }
    if (snapshotStatus === 'PENDING' || snapshotStatus === 'NEEDS_INFO') {
      return 'PENDING';
    }
    if (
      row.decision === EvaluationDecision.BLOCK ||
      row.decision === EvaluationDecision.WARN
    ) {
      return 'PENDING';
    }
    return 'RESOLVED';
  }

  private async buildAdminWorkspaceRows(params: {
    organizationId: string;
    userId: string;
    platformRole: string | null | undefined;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const allWorkspaces = await this.workspacesService.listByOrg(
      params.organizationId,
      params.userId,
      params.platformRole || 'viewer',
    );

    const filtered = (allWorkspaces || []).filter((ws) => {
      if (!params.search) return true;
      return ws.name.toLowerCase().includes(params.search.toLowerCase());
    });

    const page = params.page ?? 1;
    const limit = params.limit ?? Math.max(1, filtered.length || 1);
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    const workspaceIds = paginated.map((ws) => ws.id);

    const ownerRows = workspaceIds.length
      ? await this.organizationsService['userOrganizationRepository']
          .createQueryBuilder('uo')
          .where('uo.organization_id = :organizationId', {
            organizationId: params.organizationId,
          })
          .andWhere('uo.user_id IN (:...ownerIds)', {
            ownerIds: paginated.map((ws) => ws.ownerId).filter(Boolean),
          })
          .andWhere('uo.is_active = :isActive', { isActive: true })
          .leftJoin('uo.user', 'u')
          .select([
            'uo.user_id AS user_id',
            'u.email AS email',
            'u.first_name AS first_name',
            'u.last_name AS last_name',
          ])
          .getRawMany<{
            user_id: string;
            email: string;
            first_name: string | null;
            last_name: string | null;
          }>()
      : [];

    const ownerById = new Map(
      ownerRows.map((row) => [
        row.user_id,
        {
          userId: row.user_id,
          name:
            `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
          email: row.email,
        },
      ]),
    );

    const projectCountRows = workspaceIds.length
      ? await this.projectRepository
          .createQueryBuilder('p')
          .select('p.workspace_id', 'workspace_id')
          .addSelect('COUNT(*)::int', 'count')
          .where('p.organization_id = :organizationId', {
            organizationId: params.organizationId,
          })
          .andWhere('p.workspace_id IN (:...workspaceIds)', { workspaceIds })
          .andWhere('p.deleted_at IS NULL')
          .groupBy('p.workspace_id')
          .getRawMany<{ workspace_id: string; count: number }>()
      : [];
    const projectCountByWorkspace = new Map(
      projectCountRows.map((row) => [row.workspace_id, Number(row.count)]),
    );

    const evalRows = workspaceIds.length
      ? await this.governanceEvaluationRepository
          .createQueryBuilder('e')
          .where('e.organization_id = :organizationId', {
            organizationId: params.organizationId,
          })
          .andWhere('e.workspace_id IN (:...workspaceIds)', { workspaceIds })
          .orderBy('e.created_at', 'DESC')
          .getMany()
      : [];

    const openExceptionsByWorkspace = new Map<string, number>();
    const budgetStatusByWorkspace = new Map<
      string,
      'OK' | 'WARNING' | 'BLOCKED' | 'UNKNOWN'
    >();
    const capacityStatusByWorkspace = new Map<
      string,
      'OK' | 'WARNING' | 'BLOCKED' | 'UNKNOWN'
    >();

    for (const row of evalRows) {
      const wsId = row.workspaceId;
      const reasonCodes = (row.reasons || []).map((r) => r.code || '');
      const pending = this.inferExceptionStatus(row) === 'PENDING';
      if (pending) {
        openExceptionsByWorkspace.set(
          wsId,
          (openExceptionsByWorkspace.get(wsId) || 0) + 1,
        );
      }

      const isBudget = reasonCodes.some((code) => code.includes('BUDGET'));
      const isCapacity = reasonCodes.some((code) => code.includes('CAPACITY'));
      const mapped =
        row.decision === EvaluationDecision.BLOCK
          ? 'BLOCKED'
          : row.decision === EvaluationDecision.WARN
            ? 'WARNING'
            : 'OK';
      if (isBudget && !budgetStatusByWorkspace.has(wsId)) {
        budgetStatusByWorkspace.set(wsId, mapped);
      }
      if (isCapacity && !capacityStatusByWorkspace.has(wsId)) {
        capacityStatusByWorkspace.set(wsId, mapped);
      }
    }

    const data = paginated.map((ws) => ({
      id: ws.id,
      workspaceId: ws.id,
      name: ws.name,
      workspaceName: ws.name,
      status: ws.deletedAt ? 'ARCHIVED' : 'ACTIVE',
      owners: ws.ownerId && ownerById.get(ws.ownerId) ? [ownerById.get(ws.ownerId)] : [],
      projectCount: projectCountByWorkspace.get(ws.id) || 0,
      openExceptions: openExceptionsByWorkspace.get(ws.id) || 0,
      budgetStatus: budgetStatusByWorkspace.get(ws.id) || 'UNKNOWN',
      capacityStatus: capacityStatusByWorkspace.get(ws.id) || 'UNKNOWN',
    }));

    return {
      data,
      meta: { page, limit, total: filtered.length },
    };
  }

  // Helper to map backend visibility to frontend format
  private mapVisibilityToFrontend(visibility: string): string {
    const map: Record<string, string> = {
      ORG: 'public',
      WORKSPACE: 'workspace',
      PRIVATE: 'private',
    };
    return map[visibility] || visibility.toLowerCase();
  }

  private mapIntegrationConnectionForAdmin(connection: IntegrationConnection) {
    return {
      id: connection.id,
      provider: connection.type,
      authType: connection.authType,
      baseUrl: connection.baseUrl,
      email: connection.email,
      enabled: connection.enabled,
      pollingEnabled: connection.pollingEnabled,
      webhookEnabled: connection.webhookEnabled,
      status: connection.status,
      errorCount: connection.errorCount,
      lastSyncStatus: connection.lastSyncStatus || null,
      lastSyncRunAt: connection.lastSyncRunAt
        ? new Date(connection.lastSyncRunAt).toISOString()
        : null,
      updatedAt: connection.updatedAt
        ? new Date(connection.updatedAt).toISOString()
        : null,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({
    status: 200,
    description: 'Admin statistics retrieved successfully',
  })
  async getStats(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const stats = await this.adminService.getStatistics(organizationId);
      // Standardized response contract: { data: Stats }
      return { data: stats };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get admin stats', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/stats',
      });
      // Return safe defaults
      return {
        data: {
          userCount: 0,
          activeUsers: 0,
          templateCount: 0,
          projectCount: 0,
          totalItems: 0,
        },
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health' })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
  })
  async getSystemHealth(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const health = await this.adminService.getSystemHealth(organizationId);
      // Standardized response contract: { data: SystemHealth }
      return { data: health };
    } catch (_error) {
      // Never throw 500 - return error status
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get system health', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/health',
      });
      // Return error status but never throw
      return {
        data: {
          status: 'error',
          timestamp: new Date().toISOString(),
          database: 'error',
          details: {
            message: 'Health check failed',
          },
        },
      };
    }
  }

  @Get('org/summary')
  @ApiOperation({ summary: 'Get organization summary' })
  @ApiResponse({
    status: 200,
    description: 'Organization summary retrieved successfully',
  })
  async getOrgSummary(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const summary = await this.adminService.getOrgSummary(organizationId);
      // Standardized response contract: { data: OrgSummary }
      return { data: summary };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get org summary', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/org/summary',
      });
      // Return safe defaults
      return {
        data: {
          name: 'Organization',
          id: organizationId || 'unknown',
          slug: 'unknown',
          totalUsers: 0,
          totalWorkspaces: 0,
        },
      };
    }
  }

  @Get('organization/profile')
  @ApiOperation({
    summary: 'Get organization profile and governance metadata for admin console',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization profile retrieved successfully',
  })
  async getOrganizationProfile(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    const [organization, summary] = await Promise.all([
      this.organizationsService.findOne(organizationId),
      this.adminService.getOrgSummary(organizationId),
    ]);
    return {
      data: {
        ...this.mapOrganizationProfile(organization),
        tenantSummary: {
          totalUsers: summary.totalUsers || 0,
          totalWorkspaces: summary.totalWorkspaces || 0,
        },
      },
    };
  }

  @Get('users/summary')
  @ApiOperation({ summary: 'Get users summary' })
  @ApiResponse({
    status: 200,
    description: 'Users summary retrieved successfully',
  })
  async getUsersSummary(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const summary = await this.adminService.getUsersSummary(organizationId);
      // Standardized response contract: { data: UserSummary }
      return { data: summary };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get users summary', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/users/summary',
      });
      // Return safe defaults
      return {
        data: {
          total: 0,
          byRole: {
            owners: 0,
            admins: 0,
            members: 0,
            viewers: 0,
          },
        },
      };
    }
  }

  @Get('access-control/summary')
  @ApiOperation({
    summary: 'Get access control governance summary (platform and workspace role models)',
  })
  @ApiResponse({
    status: 200,
    description: 'Access control summary retrieved successfully',
  })
  getAccessControlSummary() {
    return {
      data: buildAccessControlSummaryContract(),
    };
  }

  @Get('integrations/summary')
  @ApiOperation({
    summary: 'Get integrations governance summary for administration',
  })
  @ApiResponse({
    status: 200,
    description: 'Integrations governance summary retrieved successfully',
  })
  async getIntegrationsSummary(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    const connections = await this.integrationConnectionRepository.find({
      where: { organizationId },
      order: { updatedAt: 'DESC' },
    });

    const providerSet = new Set(connections.map((conn) => conn.type));
    const enabled = connections.filter((conn) => conn.enabled).length;
    const webhookEnabled = connections.filter((conn) => conn.webhookEnabled).length;
    const errored = connections.filter((conn) => conn.status === 'error').length;

    return {
      data: {
        totals: {
          totalConnections: connections.length,
          enabledConnections: enabled,
          webhookEnabledConnections: webhookEnabled,
          erroredConnections: errored,
          providerCount: providerSet.size,
        },
        providers: Array.from(providerSet).sort(),
        editableControls: {
          adminMutationEnabled: false,
          reason:
            'Admin mutation contracts for integrations are not enabled in this phase.',
        },
      },
    };
  }

  @Get('integrations/api-access')
  @ApiOperation({
    summary: 'Get integration API access inventory for administration',
  })
  @ApiResponse({
    status: 200,
    description: 'Integration API access inventory retrieved successfully',
  })
  async getIntegrationsApiAccess(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    const connections = await this.integrationConnectionRepository.find({
      where: { organizationId },
      order: { updatedAt: 'DESC' },
    });

    return {
      data: {
        items: connections.map((connection) =>
          this.mapIntegrationConnectionForAdmin(connection),
        ),
        mode: 'read_only',
      },
    };
  }

  @Get('integrations/webhooks')
  @ApiOperation({
    summary: 'Get integration webhook governance view for administration',
  })
  @ApiResponse({
    status: 200,
    description: 'Integration webhook governance view retrieved successfully',
  })
  async getIntegrationsWebhooks(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    const connections = await this.integrationConnectionRepository.find({
      where: { organizationId },
      order: { updatedAt: 'DESC' },
    });

    const webhookItems = connections
      .filter((connection) => connection.webhookEnabled)
      .map((connection) => ({
        connectionId: connection.id,
        provider: connection.type,
        destination: connection.baseUrl,
        enabled: connection.webhookEnabled,
        status: connection.status,
        updatedAt: connection.updatedAt
          ? new Date(connection.updatedAt).toISOString()
          : null,
      }));

    return {
      data: {
        items: webhookItems,
        mode: 'read_only',
      },
    };
  }

  @Get('ai-governance/summary')
  @ApiOperation({
    summary: 'Get AI governance summary for administration',
  })
  @ApiResponse({
    status: 200,
    description: 'AI governance summary retrieved successfully',
  })
  getAIGovernanceSummary() {
    return {
      data: buildAIGovernanceSummaryContract(),
    };
  }

  @Get('ai-governance/usage')
  @ApiOperation({
    summary: 'Get AI advisory usage observations for administration',
  })
  @ApiResponse({
    status: 200,
    description: 'AI advisory usage observations retrieved successfully',
  })
  async getAIGovernanceUsage(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    const days = 30;
    const from = new Date();
    from.setDate(from.getDate() - days);

    const aiEvents = await this.auditEventRepository
      .createQueryBuilder('ae')
      .where('ae.organization_id = :organizationId', { organizationId })
      .andWhere('ae.created_at >= :from', { from: from.toISOString() })
      .andWhere("(ae.metadata_json->>'source') IN (:...sources)", {
        sources: ['ai_advisory_v2', 'advisory_card_v1'],
      })
      .orderBy('ae.created_at', 'DESC')
      .limit(200)
      .getMany();

    const sourceCounts: Record<string, number> = {
      ai_advisory_v2: 0,
      advisory_card_v1: 0,
    };
    const workspaceSet = new Set<string>();
    const actorSet = new Set<string>();

    for (const event of aiEvents) {
      if (event.workspaceId) {
        workspaceSet.add(event.workspaceId);
      }
      if (event.actorUserId) {
        actorSet.add(event.actorUserId);
      }
      const source = String(event.metadataJson?.source || '');
      if (source in sourceCounts) {
        sourceCounts[source] = sourceCounts[source] + 1;
      }
    }

    return {
      data: {
        windowDays: days,
        totalEvents: aiEvents.length,
        advisoryEvents: sourceCounts.ai_advisory_v2,
        cardAdvisoryEvents: sourceCounts.advisory_card_v1,
        uniqueActors: actorSet.size,
        workspaceCoverage: workspaceSet.size,
        mode: 'read_only',
      },
    };
  }

  @Get('workspaces/summary')
  @ApiOperation({ summary: 'Get workspaces summary' })
  @ApiResponse({
    status: 200,
    description: 'Workspaces summary retrieved successfully',
  })
  async getWorkspacesSummary(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const summary =
        await this.adminService.getWorkspacesSummary(organizationId);
      // Standardized response contract: { data: WorkspaceSummary }
      return { data: summary };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get workspaces summary', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/workspaces/summary',
      });
      // Return safe defaults
      return {
        data: {
          total: 0,
          byType: {
            public: 0,
            private: 0,
          },
          byStatus: {
            active: 0,
            archived: 0,
          },
        },
      };
    }
  }

  @Get('risk/summary')
  @ApiOperation({ summary: 'Get risk summary' })
  @ApiResponse({
    status: 200,
    description: 'Risk summary retrieved successfully',
  })
  async getRiskSummary(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const summary = await this.adminService.getRiskSummary(organizationId);
      // Standardized response contract: { data: RiskSummary }
      return { data: summary };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get risk summary', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/risk/summary',
      });
      // Return safe defaults
      return {
        data: {
          projectsAtRisk: 0,
          overallocatedResources: 0,
        },
      };
    }
  }

  @Get('audit')
  @ApiOperation({ summary: 'Get recent admin audit events' })
  @ApiResponse({
    status: 200,
    description: 'Admin audit events retrieved successfully',
  })
  async getAudit(
    @Request() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(limit || '50', 10) || 50));
    const { organizationId } = getAuthContext(req);

    const result = await this.auditService.query({
      organizationId,
      action,
      actorUserId: userId,
      page: pageNum,
      pageSize,
    });

    return {
      data: result.items.map(toAuditEventDto),
      meta: {
        page: pageNum,
        limit: pageSize,
        total: result.total,
      },
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get paginated users for admin management' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(
    @Request() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') _role?: string,
    @Query('status') _status?: string,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;
      const offset = (pageNum - 1) * limitNum;

      const { organizationId } = getAuthContext(req);
      const result = await this.organizationsService.getOrganizationUsers(
        organizationId,
        {
          limit: limitNum,
          offset,
          search,
        },
      );

      // Apply role and status filters client-side for now
      let filteredUsers = result.users;
      if (_role && _role !== 'all') {
        filteredUsers = filteredUsers.filter(
          (u: AdminUserRow) => this.mapOrgRoleToPlatformRole(u.role) === _role,
        );
      }
      if (_status && _status !== 'all') {
        // Map status based on isActive or other criteria
        // For now, we'll assume all users in the result are active
        // This can be enhanced based on actual status field
      }

      const totalPages = Math.ceil(result.total / limitNum);
      const userIds = filteredUsers.map((u: AdminUserRow) => String(u.id));
      const workspaceMembers =
        userIds.length > 0
          ? await this.workspaceMemberRepository
              .createQueryBuilder('wm')
              .innerJoin('wm.workspace', 'w')
              .where('wm.user_id IN (:...userIds)', { userIds })
              .andWhere('w.organization_id = :organizationId', { organizationId })
              .select([
                'wm.user_id AS user_id',
                'wm.workspace_id AS workspace_id',
                'wm.role AS role',
                'w.name AS workspace_name',
              ])
              .getRawMany<{
                user_id: string;
                workspace_id: string;
                workspace_name: string;
                role: string;
              }>()
          : [];

      const accessByUser = new Map<
        string,
        Array<{ workspaceId: string; workspaceName: string; accessLevel: string }>
      >();
      for (const row of workspaceMembers) {
        const items = accessByUser.get(row.user_id) || [];
        items.push({
          workspaceId: row.workspace_id,
          workspaceName: row.workspace_name,
          accessLevel: this.mapWorkspaceRoleForAdminView(row.role),
        });
        accessByUser.set(row.user_id, items);
      }

      const payloadUsers = filteredUsers.map((u: AdminUserRow) => ({
        id: String(u.id),
        name:
          `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
          String(u.email || ''),
        email: u.email,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        role: this.mapOrgRoleToPlatformRole(u.role),
        status: u.isActive === false ? 'inactive' : 'active',
        workspaceAccess: accessByUser.get(String(u.id)) || [],
        lastActive: u.lastActive ? new Date(u.lastActive).toISOString() : null,
        joinedAt: u.joinedAt
          ? new Date(u.joinedAt).toISOString()
          : new Date().toISOString(),
      }));
      const pagination = {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages,
      };

      // Keep legacy keys while exposing contract-first envelope.
      return {
        data: payloadUsers,
        meta: pagination,
        users: payloadUsers,
        pagination,
      };
    } catch (_error) {
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUser(@Request() req: AuthRequest, @Param('userId') userId: string) {
    try {
      const { organizationId } = getAuthContext(req);
      const result = await this.organizationsService.getOrganizationUsers(
        organizationId,
        { limit: 1000, offset: 0 },
      );
      const user = result.users.find((u: AdminUserRow) => u.id === userId);
      if (!user) {
        throw new InternalServerErrorException('User not found');
      }
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        status: 'active', // Default to active for now
        lastActive: user.lastActive
          ? new Date(user.lastActive).toISOString()
          : null,
        joinedAt: user.joinedAt
          ? new Date(user.joinedAt).toISOString()
          : new Date().toISOString(),
      };
    } catch (_error) {
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'Get all workspaces for admin management' })
  @ApiResponse({
    status: 200,
    description: 'Workspaces retrieved successfully',
  })
  async getWorkspaces(@Request() req: AuthRequest) {
    try {
      const { organizationId, userId, platformRole } = getAuthContext(req);
      const result = await this.buildAdminWorkspaceRows({
        organizationId,
        userId,
        platformRole,
        page: 1,
        limit: 1000,
      });
      return { data: result.data };
    } catch (error) {
      this.logger.error('Failed to get workspaces', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { data: [] };
    }
  }

  @Get('workspaces/snapshot')
  @ApiOperation({ summary: 'Get workspace snapshot for administration overview' })
  @ApiResponse({
    status: 200,
    description: 'Workspace snapshot retrieved successfully',
  })
  async getWorkspaceSnapshot(
    @Request() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    try {
      const { organizationId, userId, platformRole } = getAuthContext(req);
      const result = await this.buildAdminWorkspaceRows({
        organizationId,
        userId,
        platformRole,
        search,
        page: Math.max(1, parseInt(page || '1', 10) || 1),
        limit: Math.min(200, Math.max(1, parseInt(limit || '20', 10) || 20)),
      });
      return result;
    } catch (error) {
      this.logger.error('Failed to get workspace snapshot', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { data: [], meta: { page: 1, limit: 20, total: 0 } };
    }
  }

  @Get('billing/summary')
  @ApiOperation({ summary: 'Get administration billing summary' })
  @ApiResponse({ status: 200, description: 'Billing summary retrieved successfully' })
  async getBillingSummary(@Request() req: AuthRequest) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    const organization = await this.organizationsService.findOne(organizationId);
    const usersResult = await this.organizationsService.getOrganizationUsers(
      organizationId,
      { limit: 1000, offset: 0 },
    );
    const workspaces = await this.workspacesService.listByOrg(
      organizationId,
      userId,
      platformRole || 'viewer',
    );

    return {
      data: {
        currentPlan: organization.planCode || 'custom',
        planStatus: organization.planStatus || 'active',
        renewalDate: organization.planExpiresAt
          ? new Date(organization.planExpiresAt).toISOString()
          : null,
        usage: {
          activeUsers: usersResult.total || 0,
          workspaces: (workspaces || []).length,
          storageBytesUsed:
            (await this.attachmentsService.getOrgStorageUsed(organizationId)) || 0,
        },
      },
    };
  }

  @Get('billing/invoices')
  @ApiOperation({ summary: 'Get administration invoices list' })
  @ApiResponse({ status: 200, description: 'Billing invoices retrieved successfully' })
  async getBillingInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit || '20', 10) || 20));
    return {
      data: [],
      meta: {
        page: pageNum,
        limit: limitNum,
        total: 0,
      },
    };
  }

  @Get('data-management/summary')
  @ApiOperation({ summary: 'Get administration data management summary' })
  @ApiResponse({
    status: 200,
    description: 'Data management summary retrieved successfully',
  })
  async getDataManagementSummary(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    const [organization, usedBytes, effectiveBytes, retentionDays] =
      await Promise.all([
        this.organizationsService.findOne(organizationId),
        this.attachmentsService.getOrgStorageUsed(organizationId),
        this.attachmentsService.getOrgEffectiveUsage(organizationId),
        this.entitlementService.getLimit(organizationId, 'attachment_retention_days'),
      ]);

    const settings = (organization.settings || {}) as Record<string, any>;
    const identity = (settings.identity || {}) as Record<string, any>;

    return {
      data: {
        storage: {
          usedBytes: usedBytes || 0,
          effectiveBytes: effectiveBytes || 0,
        },
        retention: {
          attachmentRetentionDays: retentionDays,
          policySource: 'plan_entitlement',
        },
        residency: {
          dataRegion:
            (settings.dataRegion as string | undefined) ||
            (identity.dataRegion as string | undefined) ||
            null,
        },
        cleanup: {
          expiredAttachmentPurgeAvailable: true,
          mode: 'read_only',
          reason:
            'Cleanup trigger is available by backend contract but not exposed as destructive Admin UI control in this phase.',
        },
      },
    };
  }

  @Get('data-management/exports')
  @ApiOperation({
    summary: 'Get administration data export governance visibility',
  })
  @ApiResponse({
    status: 200,
    description: 'Data export governance visibility retrieved successfully',
  })
  getDataManagementExports() {
    return {
      data: {
        items: [],
        mode: 'read_only',
        reason: 'No admin-governed export job contracts are configured in this phase.',
      },
    };
  }

  @Get('data-management/retention')
  @ApiOperation({
    summary: 'Get administration retention policy governance view',
  })
  @ApiResponse({
    status: 200,
    description: 'Retention policy governance view retrieved successfully',
  })
  async getDataManagementRetention(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    const retentionDays = await this.entitlementService.getLimit(
      organizationId,
      'attachment_retention_days',
    );
    return {
      data: {
        attachmentRetentionDays: retentionDays,
        policySource: 'plan_entitlement',
        mode: 'read_only',
      },
    };
  }

  @Get('workspaces/:id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiResponse({ status: 200, description: 'Workspace retrieved successfully' })
  async getWorkspace(
    @Request() req: AuthRequest,
    @Param('id') workspaceId: string,
  ) {
    try {
      const { organizationId } = getAuthContext(req);
      const workspace = await this.workspacesService.getById(
        organizationId,
        workspaceId,
      );
      if (!workspace) {
        // Return null if not found (200 status)
        return { data: null };
      }

      // Fetch owner information
      let owner = null;
      if (workspace.ownerId) {
        try {
          const ownerUserOrg = await this.organizationsService[
            'userOrganizationRepository'
          ].findOne({
            where: {
              organizationId,
              userId: workspace.ownerId,
              isActive: true,
            },
            relations: ['user'],
          });
          if (ownerUserOrg?.user) {
            owner = {
              id: ownerUserOrg.user.id,
              email: ownerUserOrg.user.email,
              name:
                `${ownerUserOrg.user.firstName || ''} ${ownerUserOrg.user.lastName || ''}`.trim() ||
                ownerUserOrg.user.email,
            };
          }
        } catch {
          // Silently fail owner lookup - workspace still valid
        }
      }

      // Standardized response contract: { data: Workspace | null }
      return {
        data: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          owner,
          visibility: workspace.isPrivate ? 'private' : 'public',
          status: workspace.deletedAt ? 'archived' : 'active',
          createdAt: workspace.createdAt
            ? new Date(workspace.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: workspace.updatedAt
            ? new Date(workspace.updatedAt).toISOString()
            : new Date().toISOString(),
        },
      };
    } catch (_error) {
      // Never throw 500 - return null for not found
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get admin workspace', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        workspaceId,
        requestId,
        endpoint: 'GET /api/admin/workspaces/:id',
      });
      // Return null for not found (200 status)
      return { data: null };
    }
  }

  // Groups endpoints (stubs for Phase 2)
  @Get('groups')
  @ApiOperation({ summary: 'Get all groups' })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  getGroups(@Request() _req: AuthRequest) {
    // TODO: Implement groups API
    return [];
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiResponse({ status: 200, description: 'Group retrieved successfully' })
  async getGroup(@Request() _req: AuthRequest, @Param('id') _groupId: string) {
    // TODO: Implement get group
    throw new InternalServerErrorException('Get group not yet implemented');
  }

  // ==================== Teams Endpoints ====================

  @Get('teams')
  @ApiOperation({ summary: 'Get all teams for admin management' })
  @ApiResponse({ status: 200, description: 'Teams retrieved successfully' })
  async getTeams(
    @Request() req: AuthRequest,
    @Query() query: ListTeamsQueryDto,
  ) {
    try {
      const { organizationId } = getAuthContext(req);
      const result = await this.teamsService.listTeams(organizationId, query);

      // Map to frontend expected shape
      return result.teams.map((team) => {
        const visibility = this.mapVisibilityToFrontend(team.visibility);

        return {
          id: team.id,
          name: team.name,
          shortCode: team.slug, // Frontend expects shortCode
          color: team.color,
          visibility, // Frontend expects: 'public' | 'private' | 'workspace'
          description: team.description,
          workspaceId: team.workspaceId,
          status: team.isArchived ? 'archived' : 'active',
          memberCount: (team as any).membersCount || 0,
          projectCount: (team as any).projectsCount || 0,
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
        };
      });
    } catch (_error) {
      throw new InternalServerErrorException('Failed to fetch teams');
    }
  }

  @Get('teams/:id')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({ status: 200, description: 'Team retrieved successfully' })
  async getTeam(@Request() req: AuthRequest, @Param('id') teamId: string) {
    try {
      const { organizationId } = getAuthContext(req);
      const team = await this.teamsService.getTeamById(organizationId, teamId);

      const frontendVisibility = this.mapVisibilityToFrontend(team.visibility);

      return {
        id: team.id,
        name: team.name,
        shortCode: team.slug,
        color: team.color,
        visibility: frontendVisibility,
        description: team.description,
        workspaceId: team.workspaceId,
        status: team.isArchived ? 'archived' : 'active',
        memberCount: (team as any).membersCount || 0,
        projectCount: (team as any).projectsCount || 0,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
        members:
          team.members?.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            user: m.user
              ? {
                  id: m.user.id,
                  email: m.user.email,
                  firstName: m.user.firstName,
                  lastName: m.user.lastName,
                }
              : null,
          })) || [],
      };
    } catch (_error) {
      if (_error instanceof NotFoundException) {
        throw _error;
      }
      throw new InternalServerErrorException('Failed to fetch team');
    }
  }
}
