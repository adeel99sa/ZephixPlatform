import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

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
      order: { firstName: 'ASC' },
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
      relations: [
        'phase',
        'subtasks',
        'predecessors',
        'successors',
        'assignee',
      ],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }
}
