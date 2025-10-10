import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTemplate } from './entities/project-template.entity';
import { CreateProjectFromTemplateDto } from './dto/create-from-template.dto';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(ProjectTemplate)
    private templateRepository: Repository<ProjectTemplate>,
  ) {}

  async getSystemTemplates(organizationId: string) {
    return this.templateRepository.find({
      where: [
        { isSystem: true },
        { organizationId }
      ]
    });
  }

  async getAllTemplates(organizationId: string) {
    return this.templateRepository.find({
      where: [
        { isSystem: true },
        { organizationId }
      ]
    });
  }

  async activateTemplate(templateId: string, organizationId: string) {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, isSystem: true }
    });
    
    if (!template) {
      throw new Error('Template not found');
    }

    // Create org-specific copy
    const orgTemplate = this.templateRepository.create({
      ...template,
      id: undefined,
      isSystem: false,
      organizationId
    });

    return this.templateRepository.save(orgTemplate);
  }

  async createProjectFromTemplate(templateId: string, dto: CreateProjectFromTemplateDto, userId: string, organizationId: string) {
    // For now, just return the template data
    // Full project creation will be implemented later
    const template = await this.templateRepository.findOne({
      where: { id: templateId }
    });
    
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    
    return {
      message: 'Project creation from template is not yet fully implemented',
      template: template,
      projectName: dto.projectName,
      projectDescription: dto.projectDescription,
      userId,
      organizationId
    };
  }
}
