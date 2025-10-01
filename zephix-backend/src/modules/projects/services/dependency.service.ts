import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
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
      predecessorId: dto.dependsOnTaskId,
      successorId: taskId,
      type: (dto.dependencyType || 'finish-to-start') as 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish',
      taskId: taskId,
      dependsOnTaskId: dto.dependsOnTaskId,
      leadLagDays: dto.leadLagDays || 0,
      dependencyType: dto.dependencyType || 'finish-to-start',
      description: dto.description,
      relationshipType: dto.relationshipType || 'blocks',
      status: 'active',
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
    
    dependency.status = status;
    
    return this.dependencyRepository.save(dependency);
  }

  async delete(id: string): Promise<void> {
    await this.dependencyRepository.delete(id);
  }
}
