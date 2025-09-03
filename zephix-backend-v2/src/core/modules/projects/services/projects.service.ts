import { Injectable, NotFoundException } from '@nestjs/common';
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
    
    const savedProject = await this.projectRepository.save(project);
    const projectId = (savedProject as any).id;

    // Copy template phases if templateId exists
    if (data.templateId && projectId) {
      try {
        const templatePhases = await this.projectRepository.query(
          `SELECT * FROM template_phases WHERE template_id = $1 ORDER BY order_index`,
          [data.templateId]
        );

        if (templatePhases && templatePhases.length > 0) {
          for (const phase of templatePhases) {
            await this.projectRepository.query(
              `INSERT INTO project_phases (project_id, name, order_index, gate_requirements, status)
               VALUES ($1, $2, $3, $4, 'pending')`,
              [projectId, phase.name, phase.order_index, phase.gate_requirements]
            );
          }
          console.log(`Copied ${templatePhases.length} phases to project ${projectId}`);
        }

        // Copy KPIs from template
        const templateKpis = await this.projectRepository.query(
          `SELECT kd.* FROM kpi_definitions kd 
           WHERE kd.is_system_kpi = true 
           LIMIT 5`,
          []
        );

        for (const kpi of templateKpis) {
          await this.projectRepository.query(
            `INSERT INTO project_kpis (project_id, kpi_definition_id, name, unit, target_value)
             VALUES ($1, $2, $3, $4, $5)`,
            [projectId, kpi.id, kpi.name, kpi.unit, 100]
          );
        }
        console.log(`Copied ${templateKpis.length} KPIs to project ${projectId}`);
      } catch (error) {
        console.error('Error copying template phases:', error);
      }
    }

    return savedProject;
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