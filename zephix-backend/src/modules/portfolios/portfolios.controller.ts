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

@Controller('portfolios')
@ApiTags('portfolios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PortfoliosController {
  constructor(
    private readonly portfoliosService: PortfoliosService,
    private readonly responseService: ResponseService,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  // 1. GET /api/portfolios
  @Get()
  @ApiOperation({ summary: 'List all portfolios' })
  @ApiResponse({ status: 200, description: 'Portfolios retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async list(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const portfolios = await this.portfoliosService.list(organizationId);
    return this.responseService.success(portfolios);
  }

  // 2. POST /api/portfolios
  @Post()
  @ApiOperation({ summary: 'Create a new portfolio' })
  @ApiResponse({ status: 201, description: 'Portfolio created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createDto: CreatePortfolioDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const portfolio = await this.portfoliosService.create(
      createDto,
      organizationId,
      userId,
    );

    return this.responseService.success(portfolio);
  }

  // 3. GET /api/portfolios/:id/summary (static route before :id)
  @Get(':id/summary')
  @ApiOperation({ summary: 'Get portfolio summary with rollup metrics' })
  @ApiParam({ name: 'id', description: 'Portfolio ID', type: String })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)', required: true, example: '2025-01-31' })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required)', required: true })
  @ApiResponse({
    status: 200,
    description: 'Portfolio summary retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing startDate or endDate',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Workspace ID required or access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Portfolio not found',
  })
  async getSummary(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    // Require x-workspace-id header - wrap 400 errors as 403 for workspace header failures
    try {
      const workspaceId = await WorkspaceScopeHelper.getValidatedWorkspaceId(
        this.tenantContextService,
        this.workspaceAccessService,
        organizationId,
        userId,
        platformRole,
        true, // Required
      );

      const summary = await this.portfoliosService.getPortfolioSummary(
        id,
        workspaceId,
        startDate,
        endDate,
        organizationId,
      );

      return this.responseService.success(summary);
    } catch (error) {
      // Wrap workspace header validation errors as 403
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // If helper throws BadRequestException for missing workspace, convert to 403
      if (error instanceof BadRequestException && error.message.includes('workspace')) {
        throw new ForbiddenException('Workspace ID is required. Include x-workspace-id header.');
      }
      throw error;
    }
  }

  // 4. POST /api/portfolios/:id/projects
  @Post(':id/projects')
  @ApiOperation({ summary: 'Add projects to portfolio' })
  @ApiParam({ name: 'id', description: 'Portfolio ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Projects added to portfolio successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async addProjects(
    @Param('id') id: string,
    @Body() dto: AddProjectsToPortfolioDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    await this.portfoliosService.addProjects(id, dto, organizationId);
    return this.responseService.success({ success: true });
  }

  // 5. DELETE /api/portfolios/:id/projects
  @Delete(':id/projects')
  @ApiOperation({ summary: 'Remove projects from portfolio' })
  @ApiParam({ name: 'id', description: 'Portfolio ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Projects removed from portfolio successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async removeProjects(
    @Param('id') id: string,
    @Body() dto: RemoveProjectsFromPortfolioDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    await this.portfoliosService.removeProjects(id, dto, organizationId);
    return this.responseService.success({ success: true });
  }

  // 6. GET /api/portfolios/:id (dynamic route after static routes)
  @Get(':id')
  @ApiOperation({ summary: 'Get portfolio by ID' })
  @ApiParam({ name: 'id', description: 'Portfolio ID', type: String })
  @ApiResponse({ status: 200, description: 'Portfolio retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async getById(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const portfolio = await this.portfoliosService.getById(id, organizationId);
    return this.responseService.success(portfolio);
  }

  // 7. PATCH /api/portfolios/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update portfolio' })
  @ApiParam({ name: 'id', description: 'Portfolio ID', type: String })
  @ApiResponse({ status: 200, description: 'Portfolio updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePortfolioDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const portfolio = await this.portfoliosService.update(
      id,
      updateDto,
      organizationId,
    );

    return this.responseService.success(portfolio);
  }
}

