import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async create(createTaskDto: CreateTaskDto, organizationId: string): Promise<Task> {
    const task = this.taskRepository.create({
      ...createTaskDto,
      organizationId,
    });
    return await this.taskRepository.save(task);
  }

  async findAll(projectId: string, organizationId: string): Promise<Task[]> {
    return await this.taskRepository.find({
      where: { projectId, organizationId },
      order: { createdAt: 'DESC' },
      relations: ['assignee', 'phase'],
    });
  }

  async findOne(id: string, organizationId: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id, organizationId },
      relations: ['assignee', 'phase', 'project'],
    });
    
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, organizationId: string): Promise<Task> {
    const task = await this.findOne(id, organizationId);
    
    // Update progress to 100 if status is done
    if (updateTaskDto.status === 'done') {
      updateTaskDto.progress = 100;
      // Don't set completedDate on the DTO, set it directly in the update
    }

    Object.assign(task, updateTaskDto);

    // Set completedDate separately if task is done
    if (updateTaskDto.status === 'done') {
      task.completedDate = new Date();
    }
    return await this.taskRepository.save(task);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const task = await this.findOne(id, organizationId);
    await this.taskRepository.remove(task);
  }

  async getTasksWithDependencies(projectId: string, organizationId: string): Promise<Task[]> {
    const tasks = await this.findAll(projectId, organizationId);
    
    // Check for circular dependencies
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          if (!taskMap.has(depId)) {
            throw new BadRequestException(`Dependency ${depId} not found`);
          }
        }
      }
    }
    
    return tasks;
  }

  async updateProgress(id: string, progress: number, organizationId: string): Promise<Task> {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }
    
    return await this.update(id, { progress }, organizationId);
  }
}
