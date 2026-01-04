import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  UseGuards,
  Req,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProgramsService } from './services/programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { AssignProgramToProjectDto } from './dto/assign-program-to-project.dto';
import { UnassignProgramFromProjectDto } from './dto/unassign-program-from-project.dto';
import { ResponseService } from '../../shared/services/response.service';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { WorkspaceScopeHelper } from '../resources/helpers/workspace-scope.helper';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';

@Controller('programs')
@ApiTags('programs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgramsController {
  constructor(
    private readonly programsService: ProgramsService,
    private readonly responseService: ResponseService,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  // 1. GET /api/programs
  @Get()
  @ApiOperation({ summary: 'List all programs' })
  @ApiResponse({ status: 200, description: 'Programs retrieved successfully' })
  async list(
    @Query('portfolioId') portfolioId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const programs = await this.programsService.list(
      organizationId,
      portfolioId,
    );
    return this.responseService.success(programs);
  }

  // 2. POST /api/programs
  @Post()
  @ApiOperation({ summary: 'Create a new program' })
  @ApiResponse({ status: 201, description: 'Program created successfully' })
  async create(@Body() createDto: CreateProgramDto, @Req() req: AuthRequest) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const program = await this.programsService.create(
      createDto,
      organizationId,
      userId,
    );

    return this.responseService.success(program);
  }

  // 3. GET /api/programs/:id/summary (static route before :id)
  @Get(':id/summary')
  @ApiOperation({ summary: 'Get program summary with rollup metrics' })
  @ApiResponse({
    status: 200,
    description: 'Program summary retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Workspace ID required or access denied',
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

    // Require x-workspace-id header
    const workspaceId = await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );

    const summary = await this.programsService.getProgramSummary(
      id,
      workspaceId,
      startDate,
      endDate,
      organizationId,
    );

    return this.responseService.success(summary);
  }

  // 4. POST /api/programs/:id/assign-project
  @Post(':id/assign-project')
  @ApiOperation({ summary: 'Assign project to program' })
  @ApiResponse({
    status: 200,
    description: 'Project assigned to program successfully',
  })
  async assignProject(
    @Param('id') id: string,
    @Body() dto: AssignProgramToProjectDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    await this.programsService.assignProgramToProject(
      id,
      dto,
      organizationId,
    );

    return this.responseService.success({ success: true });
  }

  // 5. POST /api/programs/:id/unassign-project
  @Post(':id/unassign-project')
  @ApiOperation({ summary: 'Unassign project from program' })
  @ApiResponse({
    status: 200,
    description: 'Project unassigned from program successfully',
  })
  async unassignProject(
    @Param('id') id: string,
    @Body() dto: UnassignProgramFromProjectDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    await this.programsService.unassignProgramFromProject(
      dto.projectId,
      organizationId,
    );

    return this.responseService.success({ success: true });
  }

  // 6. GET /api/programs/:id (dynamic route after static routes)
  @Get(':id')
  @ApiOperation({ summary: 'Get program by ID' })
  @ApiResponse({ status: 200, description: 'Program retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async getById(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const program = await this.programsService.getById(id, organizationId);
    return this.responseService.success(program);
  }

  // 7. PATCH /api/programs/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update program' })
  @ApiResponse({ status: 200, description: 'Program updated successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProgramDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const program = await this.programsService.update(
      id,
      updateDto,
      organizationId,
    );

    return this.responseService.success(program);
  }
}

