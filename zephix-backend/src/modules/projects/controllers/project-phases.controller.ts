import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../../organizations/guards/organization.guard';
import { RolesGuard } from '../../../organizations/guards/roles.guard';
import { ProjectsService } from '../services/projects.service';

@Controller('projects/:projectId/phases')
@UseGuards(JwtAuthGuard)
export class ProjectPhasesController {
  constructor(private readonly projectsService: ProjectsService) {}

  // Minimal, hard-coded OK for now – we just need an endpoint
  @Get()
  async list(@Param('projectId') projectId: string) {
    console.log('[phases] HIT', projectId);
    return { success: true, data: [] };
  }
}
