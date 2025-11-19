import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTemplate } from '../entities/project-template.entity';
import { LegoBlock } from '../entities/lego-block.entity';
import { CreateProjectFromTemplateDto } from '../dto/create-from-template.dto';
import { Project } from '../../projects/entities/project.entity';
// import { ProjectPhase } from '../../projects/entities/project-phase.entity';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(ProjectTemplate)
    private templateRepository: Repository<ProjectTemplate>,
    @InjectRepository(LegoBlock)
    private blockRepository: Repository<LegoBlock>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    // @InjectRepository(ProjectPhase)
    // private phaseRepository: Repository<ProjectPhase>,
  ) {}

  async getAllTemplates(organizationId: string) {
    const templates = await this.templateRepository.find({
      where: [{ isSystem: true }, { organizationId }],
      relations: ['blocks'],
    });

    return templates;
  }

  async getTemplateById(id: string) {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['blocks'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async getAllBlocks(organizationId: string) {
    const blocks = await this.blockRepository.find({
      where: [{ isSystem: true }, { organizationId }],
    });

    return blocks;
  }

  async getBlocksByType(type: string, organizationId: string) {
    const blocks = await this.blockRepository.find({
      where: [
        { type: type as any, isSystem: true },
        { type: type as any, organizationId },
      ],
    });

    return blocks;
  }

  async createProjectFromTemplate(
    dto: CreateProjectFromTemplateDto,
    userId: string,
    organizationId: string,
  ) {
    // Handle "Start from Scratch" case
    if (!dto.templateId || dto.templateId === 'blank') {
      const project = this.projectRepository.create({
        name: dto.projectName,
        description: dto.projectDescription,
        organizationId,
        createdById: userId,
        methodology: 'agile' as any, // Use 'agile' as default for blank projects
        status: 'planning' as any,
        priority: 'medium' as any,
        riskLevel: 'medium' as any,
      });

      return this.projectRepository.save(project);
    }

    const template = await this.getTemplateById(dto.templateId);

    // Create project with template defaults
    const project = this.projectRepository.create({
      name: dto.projectName,
      description: dto.projectDescription,
      organizationId,
      createdById: userId,
      methodology: template.methodology as any,
      status: 'planning' as any,
      priority: 'medium' as any,
      riskLevel: 'medium' as any,
    });

    const savedProject = await this.projectRepository.save(project);

    // Create default phases if any
    if (template.phases?.length > 0) {
      await this.createProjectPhases(
        savedProject.id,
        organizationId,
        template.phases,
      );
    }

    // Track template usage
    await this.trackTemplateUsage(savedProject.id, template.id);

    return savedProject;
  }

  async addBlockToProject(
    projectId: string,
    blockId: string,
    configuration?: any,
  ) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    const block = await this.blockRepository.findOne({
      where: { id: blockId },
    });

    if (!project || !block) {
      throw new NotFoundException('Project or block not found');
    }

    // Check compatibility
    if (
      !block.compatibleMethodologies.includes(project.methodology || 'generic')
    ) {
      throw new BadRequestException(
        `Block ${block.name} is not compatible with ${project.methodology} methodology`,
      );
    }

    // For now, just return the project - settings functionality can be added later
    console.log(`Adding block ${block.name} to project ${project.name}`);

    return project;
  }

  private async createProjectPhases(
    projectId: string,
    organizationId: string,
    phases: any[],
  ) {
    let currentDate = new Date();
    const phaseEntities = [];

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);

      // Use duration from template, default to 14 days if not specified
      const duration = phase.duration || 14;
      endDate.setDate(endDate.getDate() + duration);

      // const phaseEntity = this.phaseRepository.create({
      //   projectId,
      //   organizationId,
      //   name: phase.name,
      //   description: phase.description || `${phase.name} phase`,
      //   order: i,
      //   startDate,
      //   endDate,
      //   status: 'not_started',
      //   progress: 0,
      //   totalTasks: 0,
      //   completedTasks: 0,
      //   progressPercentage: 0
      // });

      // phaseEntities.push(phaseEntity);

      // Next phase starts the day after this one ends
      currentDate = new Date(endDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // return this.phaseRepository.save(phaseEntities);
    return [];
  }

  private async trackTemplateUsage(projectId: string, templateId: string) {
    // Implementation for tracking template usage
    console.log(
      `Tracking template usage: Project ${projectId} using template ${templateId}`,
    );
  }
}
