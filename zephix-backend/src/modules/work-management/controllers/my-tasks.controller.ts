import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkTasksService } from '../services/work-tasks.service';
import { ListMyTasksQueryDto } from '../dto';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../shared/enums/platform-roles.enum';

/**
 * MP-2: Cross-workspace "My Work" landing feed.
 *
 * Distinct from GET /work/tasks (single-workspace, x-workspace-id bound):
 * this endpoint aggregates the caller's assigned tasks across every workspace
 * they can access, plus the four My Work badge counts. No x-workspace-id
 * header — the endpoint is explicitly cross-workspace. Tenant/org scoping is
 * enforced by the tenant context (JWT org) inside the service; workspace
 * visibility is bounded by getAccessibleWorkspaceIds().
 */
@Controller('work/my-tasks')
@ApiTags('Work Management')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MyTasksController {
  constructor(
    private readonly workTasksService: WorkTasksService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "List the caller's assigned tasks across all accessible workspaces",
  })
  @ApiQuery({
    name: 'bucket',
    required: false,
    enum: ['open', 'done', 'cancelled'],
  })
  @ApiQuery({ name: 'dueFrom', required: false, type: String })
  @ApiQuery({ name: 'dueTo', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['dueDate', 'updatedAt', 'createdAt'],
  })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'My Work feed with aggregates' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — guest/viewer users cannot access My Work',
  })
  async listMyTasks(
    @Req() req: AuthRequest,
    @Query() query: ListMyTasksQueryDto,
  ) {
    const auth = getAuthContext(req);

    // Viewer/guest gating is consistent with the My Work nav surface and the
    // notifications inbox: guests get 403, not an empty feed.
    if (normalizePlatformRole(auth.platformRole) === PlatformRole.VIEWER) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Guest users cannot access My Work',
      });
    }

    const result = await this.workTasksService.listMyTasks(auth, query);
    return this.responseService.success(result);
  }
}
