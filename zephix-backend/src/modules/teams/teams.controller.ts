import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard, OrganizationValidationGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async findAll(@Request() req) {
    // For now, get all teams for the user's organization
    // In a real app, this would filter by current workspace
    return this.teamsService.findByOrganization(req.user.organizationId);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateTeamDto) {
    const workspaceId = dto.workspaceId || req.user.currentWorkspaceId || req.user.organizationId;
    return this.teamsService.create({
      ...dto,
      workspaceId,
      createdBy: req.user.id
    });
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.teamsService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateData: Partial<CreateTeamDto>) {
    return this.teamsService.update(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.teamsService.remove(id);
    return { message: 'Team deleted successfully' };
  }
}
