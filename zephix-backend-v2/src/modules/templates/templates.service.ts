import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { TemplatePhase } from './entities/template-phase.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(TemplatePhase)
    private templatePhaseRepository: Repository<TemplatePhase>,
  ) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<Template> {
    const { phases, ...templateData } = createTemplateDto;
    
    const template = this.templateRepository.create(templateData);
    const savedTemplate = await this.templateRepository.save(template);

    // Create phases if provided
    if (phases && phases.length > 0) {
      const templatePhases = phases.map((phase, index) => 
        this.templatePhaseRepository.create({
          ...phase,
          template_id: savedTemplate.id,
          order_index: phase.order_index || index + 1,
        })
      );
      await this.templatePhaseRepository.save(templatePhases);
    }

    return this.findOne(savedTemplate.id);
  }

  async findAll(): Promise<Template[]> {
    return this.templateRepository.find({
      relations: ['phases'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['phases'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<Template> {
    const { phases, ...templateData } = updateTemplateDto;
    
    const template = await this.findOne(id);
    
    // Update template data
    Object.assign(template, templateData);
    await this.templateRepository.save(template);

    // Update phases if provided
    if (phases) {
      // Delete existing phases
      await this.templatePhaseRepository.delete({ template_id: id });
      
      // Create new phases
      if (phases.length > 0) {
        const templatePhases = phases.map((phase, index) => 
          this.templatePhaseRepository.create({
            ...phase,
            template_id: id,
            order_index: phase.order_index || index + 1,
          })
        );
        await this.templatePhaseRepository.save(templatePhases);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
  }

  async findSystemTemplates(): Promise<Template[]> {
    return this.templateRepository.find({
      where: { is_system: true, is_active: true },
      relations: ['phases'],
      order: { name: 'ASC' },
    });
  }

  async findOrganizationTemplates(organizationId: string): Promise<Template[]> {
    return this.templateRepository.find({
      where: { 
        organization_id: organizationId,
        is_active: true 
      },
      relations: ['phases'],
      order: { name: 'ASC' },
    });
  }
}
