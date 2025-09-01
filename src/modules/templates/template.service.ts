import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
  ) {}

  async getSystemTemplates(organizationId: string) {
    return this.templateRepository.find({
      where: [
        { isSystem: true, isActive: true },
        { organizationId, isActive: true }
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
}
