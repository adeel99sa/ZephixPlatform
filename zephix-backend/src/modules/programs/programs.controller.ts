import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Req,
  Body,
  Param,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProgramsService } from './services/programs.service';
import { ProgramsRollupService } from './services/programs-rollup.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ResponseService } from '../../shared/services/response.service';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { RequireWorkspaceAccessGuard } from '../workspaces/guards/require-workspace-access.guard';
import { SetMetadata } from '@nestjs/common';
import {
  normalizePlatformRole,
  isAdminRole,
  PlatformRole,
} from '../../shared/enums/platform-roles.enum';

/**
 * PHASE 6: Workspace-Scoped Programs Controller
 * Routes: /api/workspaces/:workspaceId/portfolios/:portfolioId/programs
 *         /api/workspaces/:workspaceId/programs/:programId
 */
@Controller('workspaces/:workspaceId')
@ApiTags('programs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgramsController {
  constructor(
    private readonly programsService: ProgramsService,
    private readonly programsRollupService: ProgramsRollupService,
    private readonly responseService: ResponseService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  // PHASE 6: GET /api/workspaces/:workspaceId/programs
  @Get('programs')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'read')
  @ApiOperation({ summary: 'List all programs in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiResponse({ status: 200, description: 'Programs retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async listByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      req.user.role || req.user.platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const programs = await this.programsService.listByWorkspace(
      organizationId,
      workspaceId,
    );

    return this.responseService.success(programs);
  }

  // PHASE 6: GET /api/workspaces/:workspaceId/portfolios/:portfolioId/programs
  @Get('portfolios/:portfolioId/programs')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'read')
  @ApiOperation({ summary: 'List programs in portfolio' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID', type: String })
  @ApiResponse({ status: 200, description: 'Programs retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workspace or portfolio not found' })
  async listByPortfolio(
    @Param('workspaceId') workspaceId: string,
    @Param('portfolioId') portfolioId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      req.user.role || req.user.platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const programs = await this.programsService.listByPortfolio(
      organizationId,
      workspaceId,
      portfolioId,
    );

    return this.responseService.success(programs);
  }

  // PHASE 6: POST /api/workspaces/:workspaceId/portfolios/:portfolioId/programs
  @Post('portfolios/:portfolioId/programs')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'write')
  @ApiOperation({ summary: 'Create a new program in portfolio' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio ID', type: String })
  @ApiResponse({ status: 201, description: 'Program created successfully' })
  @ApiResponse({ status: 404, description: 'Workspace or portfolio not found' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Param('portfolioId') portfolioId: string,
    @Body() createDto: CreateProgramDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      req.user.role || req.user.platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is Admin (only Admin can create)
    const userRole = normalizePlatformRole(
      req.user.platformRole || req.user.role,
    );
    const isAdmin = isAdminRole(userRole);

    if (!isAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    const program = await this.programsService.create(
      { ...createDto, portfolioId },
      organizationId,
      workspaceId,
      userId,
    );

    return this.responseService.success(program);
  }

  // PHASE 6: GET /api/workspaces/:workspaceId/programs/:programId
  @Get('programs/:programId')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'read')
  @ApiOperation({ summary: 'Get program by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'programId', description: 'Program ID', type: String })
  @ApiResponse({ status: 200, description: 'Program retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Program or workspace not found' })
  async getById(
    @Param('workspaceId') workspaceId: string,
    @Param('programId') programId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      req.user.role || req.user.platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const program = await this.programsService.getById(
      programId,
      organizationId,
      workspaceId,
    );

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return this.responseService.success(program);
  }

  // PHASE 6: PATCH /api/workspaces/:workspaceId/programs/:programId
  @Patch('programs/:programId')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'write')
  @ApiOperation({ summary: 'Update program' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'programId', description: 'Program ID', type: String })
  @ApiResponse({ status: 200, description: 'Program updated successfully' })
  @ApiResponse({ status: 404, description: 'Program or workspace not found' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('programId') programId: string,
    @Body() updateDto: UpdateProgramDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      req.user.role || req.user.platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is Admin (only Admin can edit)
    const userRole = normalizePlatformRole(
      req.user.platformRole || req.user.role,
    );
    const isAdmin = isAdminRole(userRole);

    if (!isAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    const program = await this.programsService.update(
      programId,
      updateDto,
      organizationId,
      workspaceId,
    );

    return this.responseService.success(program);
  }

  // PHASE 6: POST /api/workspaces/:workspaceId/programs/:programId/archive
  @Post('programs/:programId/archive')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'write')
  @ApiOperation({ summary: 'Archive program' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'programId', description: 'Program ID', type: String })
  @ApiResponse({ status: 200, description: 'Program archived successfully' })
  @ApiResponse({ status: 404, description: 'Program or workspace not found' })
  async archive(
    @Param('workspaceId') workspaceId: string,
    @Param('programId') programId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      req.user.role || req.user.platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is Admin (only Admin can archive)
    const userRole = normalizePlatformRole(
      req.user.platformRole || req.user.role,
    );
    const isAdmin = isAdminRole(userRole);

    if (!isAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    const program = await this.programsService.archive(
      programId,
      organizationId,
      workspaceId,
    );

    return this.responseService.success(program);
  }

  // PHASE 6: GET /api/workspaces/:workspaceId/programs/:programId/rollup
  @Get('programs/:programId/rollup')
  @UseGuards(RequireWorkspaceAccessGuard)
  @SetMetadata('workspaceAccessMode', 'read')
  @ApiOperation({ summary: 'Get program rollup' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID', type: String })
  @ApiParam({ name: 'programId', description: 'Program ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Program rollup retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Program or workspace not found' })
  async getRollup(
    @Param('workspaceId') workspaceId: string,
    @Param('programId') programId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Verify workspace access - return 404 if no access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      req.user.role || req.user.platformRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const rollup = await this.programsRollupService.getRollup(
      programId,
      organizationId,
      workspaceId,
    );

    return this.responseService.success(rollup);
  }
}
