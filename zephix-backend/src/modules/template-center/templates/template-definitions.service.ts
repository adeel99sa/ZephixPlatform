import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { TemplateDefinition } from './entities/template-definition.entity';
import { TemplateVersion } from './entities/template-version.entity';
import { ListTemplatesQueryDto } from './dto/list-templates-query.dto';

@Injectable()
export class TemplateDefinitionsService {
  constructor(
    @InjectRepository(TemplateDefinition)
    private readonly defRepo: Repository<TemplateDefinition>,
    @InjectRepository(TemplateVersion)
    private readonly versionRepo: Repository<TemplateVersion>,
  ) {}

  async list(
    query: ListTemplatesQueryDto,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<{
    definitions: TemplateDefinition[];
    latestVersions: Map<string, TemplateVersion>;
  }> {
    const qb = this.defRepo.createQueryBuilder('d');
    if (query.scope) {
      qb.andWhere('d.scope = :scope', { scope: query.scope });
    }
    qb.andWhere('(d.org_id IS NULL OR d.org_id = :orgId)', {
      orgId: organizationId,
    });
    if (query.workspaceId) {
      qb.andWhere('(d.workspace_id IS NULL OR d.workspace_id = :workspaceId)', {
        workspaceId: query.workspaceId,
      });
    } else if (workspaceId) {
      qb.andWhere('(d.workspace_id IS NULL OR d.workspace_id = :workspaceId)', {
        workspaceId,
      });
    }
    if (query.search) {
      qb.andWhere(
        '(d.name ILIKE :search OR d.template_key ILIKE :search OR d.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.category) {
      qb.andWhere('d.category = :category', { category: query.category });
    }
    qb.orderBy('d.name', 'ASC');
    const definitions = await qb.getMany();

    const defIds = definitions.map((d) => d.id);
    const latestVersions = new Map<string, TemplateVersion>();
    if (defIds.length > 0) {
      const versions = await this.versionRepo
        .createQueryBuilder('v')
        .where('v.template_definition_id IN (:...ids)', { ids: defIds })
        .andWhere('v.status = :status', { status: 'published' })
        .orderBy('v.version', 'DESC')
        .getMany();
      const byDef = new Map<string, TemplateVersion>();
      for (const v of versions) {
        if (!byDef.has(v.templateDefinitionId)) {
          byDef.set(v.templateDefinitionId, v);
        }
      }
      byDef.forEach((v, k) => latestVersions.set(k, v));
    }
    return { definitions, latestVersions };
  }

  async getByKey(
    templateKey: string,
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<{ definition: TemplateDefinition; versions: TemplateVersion[] }> {
    const definition = await this.defRepo.findOne({
      where: [
        { templateKey, scope: 'system' },
        { templateKey, scope: 'org', orgId: organizationId },
        ...(workspaceId
          ? [
              {
                templateKey,
                scope: 'workspace',
                orgId: organizationId,
                workspaceId,
              },
            ]
          : []),
      ],
    });
    if (!definition) {
      throw new NotFoundException(
        `Template with key "${templateKey}" not found`,
      );
    }
    const versions = await this.versionRepo.find({
      where: { templateDefinitionId: definition.id },
      order: { version: 'DESC' },
    });
    return { definition, versions };
  }

  async getPublishedVersion(
    templateDefinitionId: string,
    version?: number,
  ): Promise<TemplateVersion | null> {
    if (version != null) {
      return this.versionRepo.findOne({
        where: { templateDefinitionId, version, status: 'published' },
      });
    }
    return this.versionRepo.findOne({
      where: { templateDefinitionId, status: 'published' },
      order: { version: 'DESC' },
    });
  }
}
