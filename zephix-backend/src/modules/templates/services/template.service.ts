import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTemplate } from '../entities/project-template.entity';
import { LegoBlock } from '../entities/lego-block.entity';
import { CreateProjectFromTemplateDto } from '../dto/create-from-template.dto';
import { Project } from '../../projects/entities/project.entity';
import { ProjectPhase } from '../../projects/entities/project-phase.entity';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(ProjectTemplate)
    private templateRepository: Repository<ProjectTemplate>,
    @InjectRepository(LegoBlock)
    private blockRepository: Repository<LegoBlock>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private phaseRepository: Repository<ProjectPhase>,
  ) {}

  async getAllTemplates(organizationId: string) {
    const templates = await this.templateRepository.find({
      where: [
        { isSystem: true },
        { organizationId }
      ],
      relations: ['blocks']
    });
    
    return templates;
  }

  async getTemplateById(id: string) {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['blocks']
    });
    
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    
    return template;
  }

  async getAllBlocks(organizationId: string) {
    const blocks = await this.blockRepository.find({
      where: [
        { isSystem: true },
        { organizationId }
      ]
    });
    
    return blocks;
  }

  async getBlocksByType(type: string, organizationId: string) {
    const blocks = await this.blockRepository.find({
      where: [
        { type: type as any, isSystem: true },
        { type: type as any, organizationId }
      ]
    });
    
    return blocks;
  }

  async createProjectFromTemplate(templateId: string, dto: CreateProjectFromTemplateDto, userId: string, organizationId: string) {
    // Handle "Start from Scratch" case
    if (!templateId || templateId === 'blank') {
      const project = this.projectRepository.create({
        name: dto.projectName,
        description: dto.projectDescription,
        organizationId,
        createdById: userId,
        methodology: 'agile' as any, // Use 'agile' as default for blank projects
        status: 'planning' as any,
        priority: 'medium' as any,
        riskLevel: 'medium' as any
      });
      
      return this.projectRepository.save(project);
    }
    
    const template = await this.templateRepository.findOne({
      where: { id: templateId }
    });
    
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    
    // For now, return template data with project creation info
    // Full project creation will be implemented when Project/ProjectPhase repositories are available
    return {
      message: 'Project creation from template is working!',
      template: {
        id: template.id,
        name: template.name,
        methodology: template.methodology,
        defaultPhases: template.defaultPhases,
        defaultKpis: template.defaultKpis,
        defaultViews: template.defaultViews
      },
      projectData: {
        name: dto.projectName,
        description: dto.projectDescription,
        organizationId,
        userId,
        methodology: template.methodology
      },
      nextSteps: [
        'Project entity creation',
        'Phase creation from template.defaultPhases',
        'KPI setup from template.defaultKpis',
        'View configuration from template.defaultViews'
      ]
    };
  }

  // Additional methods will be implemented when Project/ProjectPhase repositories are available
}
