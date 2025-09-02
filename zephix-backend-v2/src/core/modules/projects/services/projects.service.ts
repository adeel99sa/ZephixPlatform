import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(data: any, organizationId: string, userId: string) {
    const project = this.projectRepository.create({
      ...data,
      organizationId,
      createdById: userId,
    });
    return this.projectRepository.save(project);
  }

  async findAllByOrganization(organizationId: string) {
    return this.projectRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const project = await this.projectRepository.findOne({
      where: { id, organizationId },
    });
    
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    
    return project;
  }

  async update(id: string, data: any, organizationId: string) {
    const project = await this.findOne(id, organizationId);
    Object.assign(project, data);
    return this.projectRepository.save(project);
  }

  async remove(id: string, organizationId: string) {
    const project = await this.findOne(id, organizationId);
    await this.projectRepository.remove(project);
    return { message: 'Project deleted successfully' };
  }
}
