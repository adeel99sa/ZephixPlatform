import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { UpdateWorkspaceConfigDto } from './dto/update-workspace-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceDto, @Req() req: any) {
    return this.workspacesService.create({
      ...createWorkspaceDto,
      organizationId: req.user.organizationId,
      ownerId: req.user.id,
    }, req.user.organizationId);
  }

  @Get()
  async findAll(@Req() req: any) {
    try {
      return await this.workspacesService.findAll(req.user.organizationId);
    } catch (error) {
      console.error('FindAll endpoint error:', error);
      return { error: error.message, stack: error.stack };
    }
  }

  @Get('my-workspaces')
  getMyWorkspaces(@Req() req: any) {
    return this.workspacesService.getUserWorkspaces(req.user.id, req.user.organizationId);
  }

  // NEW: Hierarchy endpoints - SPECIFIC ROUTES FIRST

  // GET /workspaces/test - Simple test endpoint
  @Get('test')
  test(@Req() req: any) {
    return { 
      message: 'Workspaces module is working', 
      userId: req.user?.id, 
      organizationId: req.user?.organizationId,
      timestamp: new Date().toISOString()
    };
  }

  // GET /workspaces/config - Get organization's workspace configuration
  @Get('config')
  async getConfig(@Req() req: any) {
    return this.workspacesService.getOrganizationConfig(req.user.organizationId);
  }

  // PUT /workspaces/config - Update workspace configuration (admin only)
  @Put('config')
  @UseGuards(AdminGuard)
  async updateConfig(@Req() req: any, @Body() updateDto: UpdateWorkspaceConfigDto) {
    return this.workspacesService.updateOrganizationConfig(
      req.user.organizationId,
      updateDto
    );
  }

  // GET /workspaces/roots - Get root workspaces
  @Get('roots')
  async getRoots(@Req() req: any) {
    return this.workspacesService.getRootWorkspaces(req.user.organizationId);
  }

  // PARAMETERIZED ROUTES LAST

  // GET /workspaces/:id/tree - Get workspace with children
  @Get(':id/tree')
  async getTree(@Param('id') id: string, @Req() req: any) {
    return this.workspacesService.getWorkspaceTree(id, req.user.organizationId);
  }

  // GET /workspaces/:id/path - Get breadcrumb path
  @Get(':id/path')
  async getPath(@Param('id') id: string, @Req() req: any) {
    return this.workspacesService.getWorkspacePath(id, req.user.organizationId);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string, @Req() req: any) {
    return this.workspacesService.getStats(id, req.user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.workspacesService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Req() req: any,
  ) {
    return this.workspacesService.update(id, updateWorkspaceDto, req.user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.workspacesService.remove(id, req.user.organizationId);
  }

  // POST /workspaces/hierarchy - Create workspace with hierarchy validation
  @Post('hierarchy')
  async createWithHierarchy(@Body() createDto: CreateWorkspaceDto, @Req() req: any) {
    return this.workspacesService.createWithHierarchy(
      createDto,
      req.user.id,
      req.user.organizationId
    );
  }
}
