import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationContextGuard } from '../../../guards/organization-context.guard';
import { OrganizationValidationGuard } from '../../../guards/organization-validation.guard';
import { ProjectsService } from '../services/projects.service';

@Controller('projects/:projectId/phases')
// Temporarily comment for the drill:
// @UseGuards(JwtAuthGuard, OrganizationContextGuard, OrganizationValidationGuard)
export class ProjectPhasesController {
  constructor(private readonly projectsService: ProjectsService) {}

  // Minimal, hard-coded OK for now – we just need an endpoint
  @Get()
  async list(@Param('projectId') projectId: string) {
    console.log('[phases] HIT', projectId);
    return { success: true, data: [] };
  }
}
