import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPhase } from '../entities/project-phase.entity';
import { CreatePhaseDto } from '../dto/create-phase.dto';

@Injectable()
export class PhaseService {
  constructor(
    @InjectRepository(ProjectPhase)
    private phaseRepository: Repository<ProjectPhase>,
  ) {}

  async createDefaultPhases(projectId: string, organizationId: string): Promise<ProjectPhase[]> {
    const defaultPhases = [
      { name: 'Planning', type: 'planning', order: 1 },
      { name: 'Development', type: 'development', order: 2 },
      { name: 'Testing', type: 'testing', order: 3 },
      { name: 'Deployment', type: 'deployment', order: 4 },
    ];

    const phases = [];
    for (const phaseData of defaultPhases) {
      const phase = this.phaseRepository.create({
        ...phaseData,
        projectId,
        organizationId,
      });
      phases.push(await this.phaseRepository.save(phase));
    }
    
    return phases;
  }

  async findByProject(projectId: string, organizationId: string): Promise<ProjectPhase[]> {
    return await this.phaseRepository.find({
      where: { projectId, organizationId },
      order: { order: 'ASC' },
      relations: ['tasks'],
    });
  }

  async updatePhaseProgress(phaseId: string, organizationId: string): Promise<ProjectPhase> {
    const phase = await this.phaseRepository.findOne({
      where: { id: phaseId, organizationId },
      relations: ['tasks'],
    });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    // Calculate status based on tasks
    if (phase.tasks && phase.tasks.length > 0) {
      const totalProgress = phase.tasks.reduce((sum, task) => sum + task.progressPercentage, 0);
      const averageProgress = Math.round(totalProgress / phase.tasks.length);
      
      // Update status based on progress
      if (averageProgress === 0) {
        phase.status = 'not-started';
      } else if (averageProgress === 100) {
        phase.status = 'done';
      } else {
        phase.status = 'in-progress';
      }
    }

    return await this.phaseRepository.save(phase);
  }
}
