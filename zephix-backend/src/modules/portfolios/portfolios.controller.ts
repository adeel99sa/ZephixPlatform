import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
  Body,
  Param,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfoliosService } from './services/portfolios.service';
import { PortfoliosRollupService } from './services/portfolios-rollup.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { AddProjectsToPortfolioDto } from './dto/add-projects-to-portfolio.dto';
import { RemoveProjectsFromPortfolioDto } from './dto/remove-projects-from-portfolio.dto';
import { ResponseService } from '../../shared/services/response.service';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { WorkspaceScopeHelper } from '../resources/helpers/workspace-scope.helper';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { RequireWorkspaceAccessGuard } from '../workspaces/guards/require-workspace-access.guard';
import { SetMetadata } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import {
  normalizePlatformRole,
  isAdminRole,
  PlatformRole,
} from '../../shared/enums/platform-roles.enum';

/**
 * PHASE 6: Workspace-Scoped Portfolios Controller
 * Routes: /api/workspaces/:workspaceId/portfolios
 */
@Controller('workspaces/:workspaceId/portfolios')
@ApiTags('portfolios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PortfoliosController {
  constructor(
    private readonly portfoliosService: PortfoliosService,
    private readonly portfoliosRollupService: PortfoliosRollupService,
    private readonly responseService: ResponseService,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  // PHASE 6: GET /api/workspaces/:workspaceId/portfolios
  @Get()
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'read')
  @ApiOperation({ summary: 'List portfolios in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Portfolios retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async list(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const portfolios = await this.portfoliosService.listByWorkspace(
      organizationId,
      workspaceId,
    );
    return this.responseService.success(portfolios);
  }

  // PHASE 6: POST /api/workspaces/:workspaceId/portfolios
  @Post()
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'write')
  @ApiOperation({ summary: 'Create a new portfolio in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiResponse({ status: 201, description: 'Portfolio created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() createDto: CreatePortfolioDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is Admin (only Admin can create)
    const userRole = normalizePlatformRole(platformRole);
    const isAdmin = isAdminRole(userRole);

    if (!isAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    const portfolio = await this.portfoliosService.create(
      createDto,
      organizationId,
      workspaceId,
      userId,
    );

    return this.responseService.success(portfolio);
  }

  // PHASE 6: GET /api/workspaces/:workspaceId/portfolios/:portfolioId
  @Get(':portfolioId')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'read')
  @ApiOperation({ summary: 'Get portfolio by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID', type: String })
  @ApiResponse({ status: 200, description: 'Portfolio retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Portfolio or workspace not found' })
  async getById(
    @Param('workspaceId') workspaceId: string,
    @Param('portfolioId') portfolioId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const portfolio = await this.portfoliosService.getById(
      portfolioId,
      organizationId,
      workspaceId,
    );

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    return this.responseService.success(portfolio);
  }

  // PHASE 6: PATCH /api/workspaces/:workspaceId/portfolios/:portfolioId
  @Patch(':portfolioId')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'write')
  @ApiOperation({ summary: 'Update portfolio' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID', type: String })
  @ApiResponse({ status: 200, description: 'Portfolio updated successfully' })
  @ApiResponse({ status: 404, description: 'Portfolio or workspace not found' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('portfolioId') portfolioId: string,
    @Body() updateDto: UpdatePortfolioDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is Admin (only Admin can edit)
    const userRole = normalizePlatformRole(platformRole);
    const isAdmin = isAdminRole(userRole);

    if (!isAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    const portfolio = await this.portfoliosService.update(
      portfolioId,
      updateDto,
      organizationId,
      workspaceId,
    );

    return this.responseService.success(portfolio);
  }

  // PHASE 6: POST /api/workspaces/:workspaceId/portfolios/:portfolioId/archive
  @Post(':portfolioId/archive')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'write')
  @ApiOperation({ summary: 'Archive portfolio' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID', type: String })
  @ApiResponse({ status: 200, description: 'Portfolio archived successfully' })
  @ApiResponse({ status: 404, description: 'Portfolio or workspace not found' })
  async archive(
    @Param('workspaceId') workspaceId: string,
    @Param('portfolioId') portfolioId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is Admin (only Admin can archive)
    const userRole = normalizePlatformRole(platformRole);
    const isAdmin = isAdminRole(userRole);

    if (!isAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    const portfolio = await this.portfoliosService.archive(
      portfolioId,
      organizationId,
      workspaceId,
    );

    return this.responseService.success(portfolio);
  }

  // PHASE 6: GET /api/workspaces/:workspaceId/portfolios/:portfolioId/rollup
  @Get(':portfolioId/rollup')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'read')
  @ApiOperation({ summary: 'Get portfolio rollup' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Portfolio rollup retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Portfolio or workspace not found' })
  async getRollup(
    @Param('workspaceId') workspaceId: string,
    @Param('portfolioId') portfolioId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const rollup = await this.portfoliosRollupService.getRollup(
      portfolioId,
      organizationId,
      workspaceId,
    );

    return this.responseService.success(rollup);
  }
}
