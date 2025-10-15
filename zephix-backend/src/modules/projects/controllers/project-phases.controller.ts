import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

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
