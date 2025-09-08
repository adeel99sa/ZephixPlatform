import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { ProjectPhase } from '../entities/project-phase.entity';
import { User } from '../../users/entities/user.entity';
import { CreateTaskDto, UpdateTaskDto } from '../dto/create-task.dto';
import { DependencyService } from './dependency.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(ProjectPhase)
    private phaseRepository: Repository<ProjectPhase>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dependencyService: DependencyService,
  ) {}

  async create(projectId: string, createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    // Extract dependencies for separate handling
    const { dependencies, ...taskData } = createTaskDto;
    
    // Create the task first
    const task = await this.taskRepository.save({
      ...taskData,
      projectId,
      taskNumber: await this.generateTaskNumber(projectId),
    });
    
    // Create dependencies if provided
    if (dependencies && Array.isArray(dependencies) && dependencies.length > 0) {
      for (const depDescription of dependencies) {
        if (depDescription && depDescription.trim()) {
          await this.dependencyService.create(task.id, {
            dependencyType: 'quick_text',
            description: depDescription.trim(),
            relationshipType: 'blocks',
          }, userId || null); // Pass null instead of 'system'
        }
      }
    }
    
    // Return task with dependencies loaded
    return this.findOne(task.id);
  }

  // Add helper method if not exists
  private async generateTaskNumber(projectId: string): Promise<string> {
    const count = await this.taskRepository.count({ where: { projectId } });
    return `T-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(projectId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { projectId },
      relations: ['assignee', 'subtasks', 'dependencies'],
      order: { createdAt: 'ASC' },
    });
  }

  async getAvailableUsers(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName'],
      order: { firstName: 'ASC' }
    });
  }

  async findByPhase(projectId: string, phaseId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { projectId, phaseId },
      relations: ['subtasks', 'assignee'],
      order: { taskNumber: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['phase', 'subtasks', 'predecessors', 'successors', 'assignee'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    // Extract fields that shouldn't be updated directly
    const { dependencies, ...validUpdateFields } = updateTaskDto;
    
    // Update only valid task fields
    await this.taskRepository.update(id, validUpdateFields);
    
    // Return updated task
    return this.findOne(id);
  }

  async updateProgress(id: string, progressPercentage: number): Promise<Task> {
    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    const task = await this.findOne(id);

    // Update status based on progress
    let status = task.status;
    if (progressPercentage === 0) {
      status = 'not_started';
    } else if (progressPercentage === 100) {
      status = 'completed';
    } else if (progressPercentage > 0) {
      status = 'in_progress';
    }

    await this.taskRepository.update(id, {
      progressPercentage,
      status,
      actualStartDate: progressPercentage > 0 && !task.actualStartDate ? new Date() : task.actualStartDate,
      actualEndDate: progressPercentage === 100 ? new Date() : null,
    });

    if (task.phaseId) {
      await this.updatePhaseProgress(task.phaseId);
    }

    return this.findOne(id);
  }


  private async updatePhaseProgress(phaseId: string): Promise<void> {
    const tasks = await this.taskRepository.find({
      where: { phaseId },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    await this.phaseRepository.update(phaseId, {
      totalTasks,
      completedTasks,
      progressPercentage,
    });
  }


  async delete(id: string): Promise<void> {
    const task = await this.findOne(id);
    
    if (task.phaseId) {
      await this.taskRepository.delete(id);
      await this.updatePhaseProgress(task.phaseId);
    } else {
      await this.taskRepository.delete(id);
    }
  }
}
