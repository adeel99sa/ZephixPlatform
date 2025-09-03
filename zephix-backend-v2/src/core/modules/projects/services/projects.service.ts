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
    const projectData = {
      ...data,
      organizationId,
      createdById: userId,
    };
    
    if (data.stakeholders && Array.isArray(data.stakeholders)) {
      projectData.stakeholders = data.stakeholders;
    } else if (data.stakeholders && typeof data.stakeholders === 'string') {
      projectData.stakeholders = data.stakeholders.split(',').map(s => s.trim());
    }
    
    const project = this.projectRepository.create(projectData);
    const savedProject = await this.projectRepository.save(project);
    const projectId = (savedProject as any).id;

    if (data.templateId && projectId) {
      try {
        const templatePhases = await this.projectRepository.query(
          `SELECT * FROM template_phases WHERE template_id = $1 ORDER BY order_index`,
          [data.templateId]
        );

        if (templatePhases && templatePhases.length > 0) {
          // Bulk insert all phases at once instead of loop
          const phaseValues = templatePhases.map((phase, index) => 
            `('${projectId}', '${phase.name}', ${phase.order_index}, '${phase.gate_requirements || '[]'}', 'pending')`
          ).join(',');
          
          await this.projectRepository.query(
            `INSERT INTO project_phases (project_id, name, order_index, gate_requirements, status) VALUES ${phaseValues}`
          );
          
          console.log(`Copied ${templatePhases.length} phases to project ${projectId}`);
        }

        const templateKpis = await this.projectRepository.query(
          `SELECT kd.* FROM kpi_definitions kd WHERE kd.is_system = true LIMIT 5`,
          []
        );

        if (templateKpis && templateKpis.length > 0) {
          for (const kpi of templateKpis) {
            await this.projectRepository.query(
              `INSERT INTO project_kpis (project_id, kpi_definition_id, name, unit, target_value)
               VALUES ($1, $2, $3, $4, $5)`,
              [projectId, kpi.id, kpi.name, kpi.unit, 100]
            );
          }
          console.log(`Copied ${templateKpis.length} KPIs to project ${projectId}`);
        }
      } catch (error) {
        console.error('Error copying template data:', error);
      }
    }

    return savedProject;
  }

  async findAllByOrganization(organizationId: string, page = 1, limit = 20) {
    const [projects, total] = await this.projectRepository.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    
    return {
      data: projects,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
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
    
    if (data.stakeholders && Array.isArray(data.stakeholders)) {
      data.stakeholders = data.stakeholders;
    } else if (data.stakeholders && typeof data.stakeholders === 'string') {
      data.stakeholders = data.stakeholders.split(',').map(s => s.trim());
    }
    
    Object.assign(project, data);
    return this.projectRepository.save(project);
  }

  async remove(id: string, organizationId: string) {
    const project = await this.findOne(id, organizationId);
    await this.projectRepository.remove(project);
    return { message: 'Project deleted successfully' };
  }
}
