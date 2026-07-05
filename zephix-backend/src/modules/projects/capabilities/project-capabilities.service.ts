import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import {
  ProjectCapabilities,
  resolveCapabilities,
} from './capabilities.types';
import { UpdateCapabilitiesDto } from './update-capabilities.dto';

@Injectable()
export class ProjectCapabilitiesService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async get(
    projectId: string,
    workspaceId: string,
    organizationId: string,
  ): Promise<ProjectCapabilities> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, workspaceId, organizationId },
      select: ['id', 'capabilities'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return resolveCapabilities(project.capabilities);
  }

  async patch(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    dto: UpdateCapabilitiesDto,
  ): Promise<ProjectCapabilities> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, workspaceId, organizationId },
      select: ['id', 'capabilities'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existing = (project.capabilities ?? {}) as Record<string, unknown>;
    const updates: Record<string, boolean> = {};
    if (dto.use_phases !== undefined) updates.use_phases = dto.use_phases;
    if (dto.use_iterations !== undefined) updates.use_iterations = dto.use_iterations;
    if (dto.use_gates !== undefined) updates.use_gates = dto.use_gates;
    if (dto.use_wip_limits !== undefined) updates.use_wip_limits = dto.use_wip_limits;

    const merged = { ...existing, ...updates };
    await this.projectRepo.update(
      { id: projectId, organizationId },
      { capabilities: merged },
    );
    return resolveCapabilities(merged);
  }
}
