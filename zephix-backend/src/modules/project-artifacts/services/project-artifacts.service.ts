import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';
import { Project } from '../../projects/entities/project.entity';
import {
  CustomFieldDefinition,
  ProjectArtifact,
  ProjectArtifactType,
} from '../entities/project-artifact.entity';
import { ProjectArtifactItem } from '../entities/project-artifact-item.entity';
import { DEFAULT_CUSTOM_FIELD_DEFINITIONS } from '../constants/default-custom-field-definitions';
import { CreateArtifactDto } from '../dto/create-artifact.dto';
import { UpdateArtifactDto } from '../dto/update-artifact.dto';
import { FieldDefinitionDto } from '../dto/field-definition.dto';

export interface ArtifactServiceAuth {
  userId: string;
  organizationId: string;
  platformRole?: string | null;
}

export interface ArtifactWithItemCount extends ProjectArtifact {
  itemCount: number;
}

@Injectable()
export class ProjectArtifactsService {
  private readonly logger = new Logger(ProjectArtifactsService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(ProjectArtifact))
    private readonly artifactRepo: TenantAwareRepository<ProjectArtifact>,
    @Inject(getTenantAwareRepositoryToken(ProjectArtifactItem))
    private readonly itemRepo: TenantAwareRepository<ProjectArtifactItem>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly tenantContext: TenantContextService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  /**
   * Verify the project exists in the caller's organization and return its
   * workspace_id (required to stamp the new artifact). Exposed publicly so
   * the controller can use it for the upstream workspace-membership check
   * without duplicating the org-scope query.
   */
  async loadAccessibleProject(projectId: string): Promise<Project> {
    const organizationId = this.tenantContext.assertOrganizationId();
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found in organization ${organizationId}`,
      });
    }
    if (!project.workspaceId) {
      throw new ForbiddenException({
        code: 'PROJECT_WORKSPACE_MISSING',
        message: `Project ${projectId} has no workspace; cannot host artifacts`,
      });
    }
    return project;
  }

  async create(
    projectId: string,
    dto: CreateArtifactDto,
    auth: ArtifactServiceAuth,
  ): Promise<ProjectArtifact> {
    const project = await this.loadAccessibleProject(projectId);

    // Apply default custom_field_definitions only when caller did not supply.
    // An explicit empty array `[]` is honored as "no fields" — don't backfill.
    const definitions =
      dto.customFieldDefinitions !== undefined
        ? this.normalizeFieldDefinitions(dto.customFieldDefinitions)
        : (DEFAULT_CUSTOM_FIELD_DEFINITIONS[dto.type] ?? []);

    const artifact = await this.artifactRepo.save({
      organizationId: project.organizationId,
      workspaceId: project.workspaceId,
      projectId: project.id,
      type: dto.type,
      name: dto.name,
      description: dto.description ?? null,
      icon: dto.icon ?? null,
      position: dto.position ?? 0,
      templateId: dto.templateId ?? null,
      statusGroupId: dto.statusGroupId ?? null,
      customFieldDefinitions: definitions,
      createdBy: auth.userId,
    });

    // TODO(E5): Retrofit governance hook when registry pattern emerges.
    // Sprint 5.1 defers the E5 hook per N6 — no existing plug pattern.
    // E9 audit emission below is the operational governance signal.
    await this.emitAudit(AuditAction.CREATE, artifact, auth, {
      after: this.artifactSnapshot(artifact),
      metadata: { kind: 'create', type: artifact.type },
    });

    return artifact;
  }

  async findAllForProject(
    projectId: string,
    filters: { type?: ProjectArtifactType } = {},
  ): Promise<ArtifactWithItemCount[]> {
    await this.loadAccessibleProject(projectId);

    const artifacts = await this.artifactRepo.find({
      where: {
        projectId,
        deletedAt: IsNull(),
        ...(filters.type ? { type: filters.type } : {}),
      },
      order: { position: 'ASC', createdAt: 'ASC' },
    });

    if (artifacts.length === 0) return [];

    // Single grouped count query for all artifacts in this list — avoids N+1.
    const counts = await this.itemRepo.find({
      where: {
        artifactId: In(artifacts.map((a) => a.id)),
        deletedAt: IsNull(),
      },
      select: ['id', 'artifactId'],
    });
    const countByArtifact = counts.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.artifactId] = (acc[item.artifactId] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return artifacts.map((artifact) => ({
      ...artifact,
      itemCount: countByArtifact[artifact.id] ?? 0,
    })) as ArtifactWithItemCount[];
  }

  async findOne(
    projectId: string,
    artifactId: string,
  ): Promise<ProjectArtifact> {
    await this.loadAccessibleProject(projectId);

    const artifact = await this.artifactRepo.findOne({
      where: { id: artifactId, projectId, deletedAt: IsNull() },
      relations: { statusGroup: true },
    });
    if (!artifact) {
      throw new NotFoundException({
        code: 'ARTIFACT_NOT_FOUND',
        message: `Artifact ${artifactId} not found in project ${projectId}`,
      });
    }
    return artifact;
  }

  async update(
    projectId: string,
    artifactId: string,
    dto: UpdateArtifactDto,
    auth: ArtifactServiceAuth,
  ): Promise<ProjectArtifact> {
    // `type` is intentionally not on UpdateArtifactDto. If a future caller
    // wires it back in, this guard keeps the immutability invariant.
    if ((dto as Record<string, unknown>).type !== undefined) {
      throw new BadRequestException({
        code: 'ARTIFACT_TYPE_IMMUTABLE',
        message: 'Artifact type cannot be changed after creation',
      });
    }

    const existing = await this.findOne(projectId, artifactId);
    const before = this.artifactSnapshot(existing);

    Object.assign(existing, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
      ...(dto.position !== undefined ? { position: dto.position } : {}),
      ...(dto.templateId !== undefined ? { templateId: dto.templateId } : {}),
      ...(dto.statusGroupId !== undefined
        ? { statusGroupId: dto.statusGroupId }
        : {}),
      ...(dto.customFieldDefinitions !== undefined
        ? {
            customFieldDefinitions: this.normalizeFieldDefinitions(
              dto.customFieldDefinitions,
            ),
          }
        : {}),
    });

    const updated = await this.artifactRepo.save(existing);
    await this.emitAudit(AuditAction.UPDATE, updated, auth, {
      before,
      after: this.artifactSnapshot(updated),
      metadata: { kind: 'update' },
    });
    return updated;
  }

  async softDelete(
    projectId: string,
    artifactId: string,
    auth: ArtifactServiceAuth,
  ): Promise<void> {
    const existing = await this.findOne(projectId, artifactId);
    const now = new Date();

    // Cascade soft-delete to items first so a partial failure leaves
    // an obvious orphan state rather than silent items survival.
    await this.itemRepo.update(
      { artifactId, deletedAt: IsNull() },
      { deletedAt: now },
    );
    await this.artifactRepo.update({ id: artifactId }, { deletedAt: now });

    await this.emitAudit(AuditAction.DELETE, existing, auth, {
      before: this.artifactSnapshot(existing),
      metadata: { kind: 'delete', cascadedItems: true },
    });
  }

  async reorder(
    projectId: string,
    artifactIds: string[],
    auth: ArtifactServiceAuth,
  ): Promise<void> {
    await this.loadAccessibleProject(projectId);

    const existing = await this.artifactRepo.find({
      where: { id: In(artifactIds), projectId, deletedAt: IsNull() },
      select: ['id'],
    });
    if (existing.length !== artifactIds.length) {
      throw new BadRequestException({
        code: 'ARTIFACT_REORDER_MISMATCH',
        message: 'One or more artifactIds do not belong to this project',
      });
    }

    await Promise.all(
      artifactIds.map((id, position) =>
        this.artifactRepo.update({ id }, { position }),
      ),
    );

    await this.emitAudit(
      AuditAction.UPDATE,
      {
        id: projectId,
        organizationId: auth.organizationId,
        workspaceId: '',
      } as ProjectArtifact,
      auth,
      {
        metadata: { kind: 'reorder', projectId, artifactIds },
      },
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private normalizeFieldDefinitions(
    defs: FieldDefinitionDto[],
  ): CustomFieldDefinition[] {
    return defs.map((d, index) => ({
      id: d.id ?? this.slugify(d.name),
      name: d.name,
      type: d.type,
      required: d.required ?? false,
      ...(d.enumValues ? { enumValues: d.enumValues } : {}),
      ...(d.defaultValue !== undefined ? { defaultValue: d.defaultValue } : {}),
      displayOrder: d.displayOrder ?? index,
    }));
  }

  private slugify(name: string): string {
    return (
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64) || 'field'
    );
  }

  private artifactSnapshot(a: ProjectArtifact): Record<string, unknown> {
    return {
      id: a.id,
      type: a.type,
      name: a.name,
      description: a.description ?? null,
      icon: a.icon ?? null,
      position: a.position,
      templateId: a.templateId ?? null,
      statusGroupId: a.statusGroupId ?? null,
      customFieldDefinitions: a.customFieldDefinitions,
    };
  }

  private async emitAudit(
    action: AuditAction,
    artifact: ProjectArtifact,
    auth: ArtifactServiceAuth,
    extras: {
      before?: Record<string, unknown> | null;
      after?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    } = {},
  ): Promise<void> {
    if (!this.auditService) return;
    try {
      await this.auditService.record({
        organizationId: artifact.organizationId || auth.organizationId,
        workspaceId: artifact.workspaceId || null,
        actorUserId: auth.userId,
        actorPlatformRole: auth.platformRole || 'USER',
        entityType: AuditEntityType.PROJECT_ARTIFACT,
        entityId: artifact.id,
        action,
        before: extras.before ?? null,
        after: extras.after ?? null,
        metadata: extras.metadata ?? null,
      });
    } catch (err) {
      this.logger.warn(
        `audit emit failed action=${action} artifactId=${artifact.id}: ${(err as Error).message}`,
      );
    }
  }
}
