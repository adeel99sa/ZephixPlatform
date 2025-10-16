import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ProjectPhase } from '../entities/project-phase.entity';
import { Project } from '../entities/project.entity';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/phases')
export class ProjectPhasesController {
  constructor(
    @InjectRepository(ProjectPhase) private readonly phaseRepo: Repository<ProjectPhase>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  @Get()
  async getPhases(@Param('projectId') projectId: string) {
    // Verify project exists
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const phases = await this.phaseRepo.find({
      where: { projectId },
      order: { order: 'ASC' },
    });

    return {
      success: true,
      data: phases,
    };
  }

  @Post()
  async createPhase(
    @Param('projectId') projectId: string,
    @Body() createPhaseDto: any,
  ) {
    // Verify project exists
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const phase = this.phaseRepo.create({
      ...createPhaseDto,
      projectId,
      organizationId: project.organizationId,
    });

    const savedPhase = await this.phaseRepo.save(phase);

    return {
      success: true,
      data: savedPhase,
    };
  }

  @Put(':phaseId')
  async updatePhase(
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @Body() updatePhaseDto: any,
  ) {
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, projectId },
    });

    if (!phase) {
      throw new NotFoundException(`Phase with ID ${phaseId} not found in project ${projectId}`);
    }

    Object.assign(phase, updatePhaseDto);
    const updatedPhase = await this.phaseRepo.save(phase);

    return {
      success: true,
      data: updatedPhase,
    };
  }

  @Delete(':phaseId')
  async deletePhase(
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
  ) {
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, projectId },
    });

    if (!phase) {
      throw new NotFoundException(`Phase with ID ${phaseId} not found in project ${projectId}`);
    }

    await this.phaseRepo.remove(phase);

    return {
      success: true,
      message: 'Phase deleted successfully',
    };
  }
}
