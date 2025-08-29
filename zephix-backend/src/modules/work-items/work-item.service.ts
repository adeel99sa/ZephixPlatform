import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkItem } from './entities/work-item.entity';

@Injectable()
export class WorkItemService {
  constructor(
    @InjectRepository(WorkItem)
    private workItemRepository: Repository<WorkItem>,
  ) {}

  async createWorkItem(
    projectId: string,
    title: string,
    type: 'task' | 'story' | 'bug' | 'epic',
    phaseOrSprint: string
  ) {
    // Input validation
    if (!projectId || !title || !type || !phaseOrSprint) {
      throw new BadRequestException('All required fields must be provided');
    }

    if (title.trim().length === 0) {
      throw new BadRequestException('Title cannot be empty');
    }

    const workItem = this.workItemRepository.create({
      projectId,
      title: title.trim(),
      type,
      phaseOrSprint,
      status: 'todo',
      priority: 'medium'
    });

    return this.workItemRepository.save(workItem);
  }

  async getAllWorkItems() {
    return this.workItemRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async getProjectWorkItems(projectId: string) {
    if (!projectId) {
      throw new BadRequestException('Project ID is required');
    }

    return this.workItemRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' }
    });
  }

  async updateWorkItemStatus(
    id: string,
    status: 'todo' | 'in_progress' | 'done' | 'blocked'
  ) {
    if (!id || !status) {
      throw new BadRequestException('Work item ID and status are required');
    }

    const result = await this.workItemRepository.update(id, { status });
    
    if (result.affected === 0) {
      throw new NotFoundException(`Work item with id ${id} not found`);
    }
    
    return this.workItemRepository.findOne({ where: { id } });
  }
}
