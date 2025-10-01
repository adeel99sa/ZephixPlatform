import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';

@Controller('workspaces')
@UseGuards(JwtAuthGuard, OrganizationValidationGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceDto, @Req() req: any) {
    return this.workspacesService.create({
      ...createWorkspaceDto,
      organizationId: req.user.organizationId,
      ownerId: req.user.id,
    });
  }

  @Get()
  findAll(@Req() req: any) {
    return this.workspacesService.findAll(req.user.organizationId);
  }

  @Get('my-workspaces')
  getMyWorkspaces(@Req() req: any) {
    return this.workspacesService.getUserWorkspaces(req.user.id);
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
}
