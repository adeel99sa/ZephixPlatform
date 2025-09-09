import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskDependency } from '../entities/task-dependency.entity';
import { CreateDependencyDto } from '../dto/create-dependency.dto';

@Injectable()
export class DependencyService {
  constructor(
    @InjectRepository(TaskDependency)
    private dependencyRepository: Repository<TaskDependency>,
  ) {}

  async create(taskId: string, dto: CreateDependencyDto, userId: string): Promise<TaskDependency> {
    // Create the dependency with proper field mapping
    const dependency = this.dependencyRepository.create({
      taskId,
      dependencyType: dto.dependencyType as any,
      description: dto.description,
      relationshipType: (dto.relationshipType || 'blocks') as any,
      targetDate: dto.targetDate,
      leadLagDays: dto.leadLagDays || 0,
      status: 'pending' as any,
      externalUrl: dto.externalUrl,
      externalSystem: dto.externalSystem,
      externalId: dto.externalId,
      vendorName: dto.vendorName,
      dependsOnTaskId: dto.dependsOnTaskId,
      createdBy: userId || undefined,
    });
    
    return this.dependencyRepository.save(dependency);
  }

  async findByTask(taskId: string): Promise<TaskDependency[]> {
    return this.dependencyRepository.find({
      where: { taskId },
      relations: ['dependsOnTask'],
      order: { createdAt: 'ASC' },
    });
  }

  async deleteByTaskId(taskId: string): Promise<void> {
    await this.dependencyRepository.delete({ taskId });
  }

  async updateStatus(id: string, status: string, userId: string): Promise<TaskDependency> {
    const dependency = await this.dependencyRepository.findOne({ where: { id } });
    if (!dependency) throw new Error('Dependency not found');
    
    dependency.status = status as any;
    if (status === 'completed') {
      dependency.completedAt = new Date();
      dependency.completedBy = userId;
    }
    
    return this.dependencyRepository.save(dependency);
  }

  async delete(id: string): Promise<void> {
    await this.dependencyRepository.delete(id);
  }
}
