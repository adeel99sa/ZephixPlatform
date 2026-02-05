import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Template } from '../entities/template.entity';

type SeedTemplate = {
  name: string;
  kind: Template['kind'];
  category?: Template['category'];
  description?: string | null;
  icon?: string | null;
  isActive?: boolean;
  isGlobal?: boolean;
  config?: any;
};

@Injectable()
export class TemplatesSeedService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
  ) {}

  async seedDefaults(params: {
    organizationId: string;
    createdById: string;
  }): Promise<{ created: number; templates: Template[] }> {
    const organizationId = (params.organizationId || '').trim();
    const createdById = (params.createdById || '').trim();

    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }
    if (!createdById) {
      throw new BadRequestException('createdById is required');
    }

    const seeds = this.getDefaultSeeds();

    const existing = await this.templateRepo.find({
      where: { organizationId } as any,
      select: ['id', 'name'] as any,
    });

    const existingNames = new Set(
      (existing || [])
        .map((t) => (t?.name || '').toLowerCase().trim())
        .filter(Boolean),
    );

    const toCreate = seeds.filter((s) => {
      const key = s.name.toLowerCase().trim();
      return !existingNames.has(key);
    });

    if (toCreate.length === 0) {
      return { created: 0, templates: [] };
    }

    const entities: Template[] = [];
    for (const s of toCreate) {
      const partial: DeepPartial<Template> = {
        organizationId,
        name: s.name,
        kind: s.kind,
        category: s.category ?? null,
        description: s.description ?? null,
        icon: s.icon ?? null,
        isActive: s.isActive ?? true,
        isSystem: true,
        templateScope: 'ORG',
        structure: s.config ?? {},
        methodology: s.config?.methodology ?? null,
        createdById: createdById,
        updatedById: createdById,
      };
      const entity = this.templateRepo.create(partial);
      entities.push(entity);
    }

    const saved = await this.templateRepo.save(entities);

    return { created: saved.length, templates: saved };
  }

  private getDefaultSeeds(): SeedTemplate[] {
    return [
      {
        name: 'Agile Scrum',
        kind: 'project',
        category: 'methodology',
        description: 'Scrum project template',
        icon: 'sprint',
        isActive: true,
        isGlobal: false,
        config: {
          methodology: 'SCRUM',
          phases: [
            { key: 'backlog', name: 'Backlog' },
            { key: 'planning', name: 'Sprint Planning' },
            { key: 'execution', name: 'Sprint Execution' },
            { key: 'review', name: 'Sprint Review' },
            { key: 'retro', name: 'Retrospective' },
          ],
        },
      },
      {
        name: 'Kanban',
        kind: 'board',
        category: 'methodology',
        description: 'Kanban board template',
        icon: 'columns',
        isActive: true,
        isGlobal: false,
        config: {
          methodology: 'KANBAN',
          columns: ['Backlog', 'Ready', 'Doing', 'Blocked', 'Done'],
        },
      },
      {
        name: 'Waterfall PMI',
        kind: 'project',
        category: 'methodology',
        description: 'PMI waterfall phases',
        icon: 'layers',
        isActive: true,
        isGlobal: false,
        config: {
          methodology: 'WATERFALL',
          phases: [
            { key: 'initiation', name: 'Initiation' },
            { key: 'planning', name: 'Planning' },
            { key: 'execution', name: 'Execution' },
            { key: 'monitoring', name: 'Monitoring and Controlling' },
            { key: 'closure', name: 'Closure' },
          ],
        },
      },
      {
        name: 'Product Delivery',
        kind: 'project',
        category: 'methodology',
        description: 'Product delivery lifecycle',
        icon: 'package',
        isActive: true,
        isGlobal: false,
        config: {
          methodology: 'PRODUCT',
          phases: [
            { key: 'discovery', name: 'Discovery' },
            { key: 'definition', name: 'Definition' },
            { key: 'build', name: 'Build' },
            { key: 'launch', name: 'Launch' },
            { key: 'iterate', name: 'Iterate' },
          ],
        },
      },
      {
        name: 'Intake Pipeline',
        kind: 'board',
        category: 'pipeline',
        description: 'Intake workflow',
        icon: 'inbox',
        isActive: true,
        isGlobal: false,
        config: {
          methodology: 'INTAKE',
          stages: ['Submitted', 'Triage', 'Approved', 'Scheduled', 'Rejected'],
        },
      },
    ];
  }
}
