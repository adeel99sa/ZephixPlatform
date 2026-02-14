import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  Req,
  Param,
  Body,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ResponseService } from '../../../shared/services/response.service';
import { ScenariosService } from '../services/scenarios.service';
import { ScenarioComputeService } from '../services/scenario-compute.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { ScenarioScopeType } from '../entities/scenario-plan.entity';
import { ScenarioActionType } from '../entities/scenario-action.entity';
import { RequireEntitlement } from '../../billing/entitlements/require-entitlement.guard';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_SCOPE_TYPES: ScenarioScopeType[] = ['portfolio', 'project'];
const VALID_ACTION_TYPES: ScenarioActionType[] = [
  'shift_project',
  'shift_task',
  'change_capacity',
  'change_budget',
];

/** Block VIEWER entirely; require workspace read for MEMBER; write for compute/mutate */
function requireNotViewer(role: PlatformRole): void {
  if (role === PlatformRole.VIEWER) {
    throw new ForbiddenException({
      code: 'FORBIDDEN_ROLE',
      message: 'Scenarios not available for Viewer role',
    });
  }
}

function requireWriteRole(role: PlatformRole): void {
  if (role !== PlatformRole.ADMIN) {
    throw new ForbiddenException({
      code: 'FORBIDDEN_ROLE',
      message: 'Only Admin or Owner can modify scenarios',
    });
  }
}

@Controller()
@ApiTags('scenarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireEntitlement('what_if_scenarios')
export class ScenariosController {
  constructor(
    private readonly scenariosService: ScenariosService,
    private readonly computeService: ScenarioComputeService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly responseService: ResponseService,
  ) {}

  // ── CRUD ─────────────────────────────────────────────────────────────

  @Post('work/workspaces/:workspaceId/scenarios')
  async create(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: {
      name: string;
      description?: string;
      scopeType: ScenarioScopeType;
      scopeId: string;
    },
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    requireWriteRole(role);
    if (role !== PlatformRole.ADMIN) {
      await this.workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);
    }

    if (!body.name || !body.scopeId || !VALID_SCOPE_TYPES.includes(body.scopeType)) {
      throw new BadRequestException('name, scopeType, and scopeId are required');
    }

    const plan = await this.scenariosService.create({
      organizationId: auth.organizationId,
      workspaceId,
      name: body.name,
      description: body.description,
      scopeType: body.scopeType,
      scopeId: body.scopeId,
      createdBy: auth.userId,
      actor: { userId: auth.userId, platformRole: auth.platformRole },
    });

    return this.responseService.success(plan);
  }

  @Get('work/workspaces/:workspaceId/scenarios')
  async list(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    requireNotViewer(role);
    await this.workspaceRoleGuard.requireWorkspaceRead(workspaceId, auth.userId);

    const plans = await this.scenariosService.list(auth.organizationId, workspaceId);
    return this.responseService.success(plans);
  }

  @Get('work/scenarios/:id')
  async getById(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    requireNotViewer(role);

    const plan = await this.scenariosService.getById(id, auth.organizationId);
    return this.responseService.success(plan);
  }

  @Patch('work/scenarios/:id')
  async update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; status?: 'draft' | 'active' },
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    requireWriteRole(role);

    const plan = await this.scenariosService.update(
      id,
      auth.organizationId,
      body,
      { userId: auth.userId, platformRole: auth.platformRole },
    );
    return this.responseService.success(plan);
  }

  @Delete('work/scenarios/:id')
  async remove(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    requireWriteRole(role);

    await this.scenariosService.softDelete(
      id,
      auth.organizationId,
      { userId: auth.userId, platformRole: auth.platformRole },
    );
    return this.responseService.success({ deleted: true });
  }

  // ── Actions ──────────────────────────────────────────────────────────

  @Post('work/scenarios/:id/actions')
  async addAction(
    @Req() req: AuthRequest,
    @Param('id') scenarioId: string,
    @Body() body: { actionType: ScenarioActionType; payload: any },
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    requireWriteRole(role);

    if (!VALID_ACTION_TYPES.includes(body.actionType)) {
      throw new BadRequestException(`Invalid actionType. Allowed: ${VALID_ACTION_TYPES.join(', ')}`);
    }

    const action = await this.scenariosService.addAction({
      scenarioId,
      organizationId: auth.organizationId,
      actionType: body.actionType,
      payload: body.payload || {},
      actor: { userId: auth.userId, platformRole: auth.platformRole },
    });

    return this.responseService.success(action);
  }

  @Delete('work/scenarios/:id/actions/:actionId')
  async removeAction(
    @Req() req: AuthRequest,
    @Param('id') scenarioId: string,
    @Param('actionId') actionId: string,
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    requireWriteRole(role);

    await this.scenariosService.removeAction(
      actionId,
      scenarioId,
      auth.organizationId,
      { userId: auth.userId, platformRole: auth.platformRole },
    );
    return this.responseService.success({ deleted: true });
  }

  // ── Compute ──────────────────────────────────────────────────────────

  @Post('work/scenarios/:id/compute')
  async compute(
    @Req() req: AuthRequest,
    @Param('id') scenarioId: string,
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    requireWriteRole(role);

    const result = await this.computeService.compute(scenarioId, auth.organizationId);
    return this.responseService.success(result);
  }
}
