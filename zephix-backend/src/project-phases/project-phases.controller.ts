import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectPhasesService } from './project-phases.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@Controller('projects/:projectId/__phases__')
@UseGuards(JwtAuthGuard)
export class ProjectPhasesController {
  constructor(private readonly service: ProjectPhasesService) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    return this.service.listByProject(projectId);
  }

  @Post()
  async create(@Param('projectId') projectId: string, @Body() dto: CreatePhaseDto) {
    return this.service.create(projectId, dto);
  }
}
