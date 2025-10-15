import { Controller, Get, Param } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';

@Controller('projects/:projectId/phases')
export class ProjectPhasesController {
  constructor(private readonly projectsService: ProjectsService) {}

  // Minimal, hard-coded OK for now – we just need an endpoint
  @Get()
  async list(@Param('projectId') projectId: string) {
    console.log('[phases] HIT', projectId);
    return { success: true, data: [] };
  }
}
