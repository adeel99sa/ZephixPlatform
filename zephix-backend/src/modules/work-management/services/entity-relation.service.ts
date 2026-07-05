import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Or, Repository } from 'typeorm';

import {
  WorkEntityLink,
  WorkEntityType,
  WorkRelationType,
} from '../entities/work-entity-link.entity';
import { WorkTask } from '../entities/work-task.entity';
import { WorkRisk } from '../entities/work-risk.entity';
import { ProjectArtifactItem } from '../../project-artifacts/entities/project-artifact-item.entity';
import { CreateEntityLinkDto } from '../dto/create-entity-link.dto';

/**
 * GC_ENDPOINT_TABLES — maps WorkEntityType enum values to their backing table
 * repositories and the column used for soft-delete liveness checks.
 *
 * MIRROR-COMMENT: Any change to this mapping MUST also update:
 *  - work-entity-link.entity.ts WorkEntityType enum JSDoc
 *  - entity-relation.service.spec.ts GC_ENDPOINT_TABLES describe block
 *
 * | WorkEntityType | Table                  | Soft-delete column |
 * | TASK           | work_tasks             | deleted_at         |
 * | RISK           | work_risks             | deleted_at         |
 * | ARTIFACT       | project_artifact_items | deleted_at         |
 */

@Injectable()
export class EntityRelationService {
  private readonly logger = new Logger(EntityRelationService.name);

  constructor(
    @InjectRepository(WorkEntityLink)
    private readonly linkRepo: Repository<WorkEntityLink>,
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(WorkRisk)
    private readonly riskRepo: Repository<WorkRisk>,
    @InjectRepository(ProjectArtifactItem)
    private readonly artifactItemRepo: Repository<ProjectArtifactItem>,
  ) {}

  // ── Write normalization ─────────────────────────────────────────────────────

  /**
   * Normalizes endpoint direction before insert to prevent semantic duplicates.
   *
   * MITIGATES: always stored TASK→RISK (source=TASK, target=RISK).
   * Rationale: "task T mitigates risk R" and "risk R mitigated-by task T" are
   * semantically identical; without normalization the unique constraint won't
   * catch them because endpoints are stored as given. Flip happens silently —
   * not a 400. MIRROR: work-entity-link.entity.ts WorkRelationType.MITIGATES
   *
   * RELATES_TO: symmetric relation — normalized by sorting endpoint pair
   * (entity_type string ascending, then uuid ascending) so "A relates-to B" and
   * "B relates-to A" produce the same canonical row and hit the unique constraint.
   * MIRROR: work-entity-link.entity.ts WorkRelationType.RELATES_TO JSDoc (none,
   * symmetric is the natural expectation)
   */
  normalizeEndpoints(
    sourceType: WorkEntityType,
    sourceId: string,
    targetType: WorkEntityType,
    targetId: string,
    relationType: WorkRelationType,
  ): {
    sourceType: WorkEntityType;
    sourceId: string;
    targetType: WorkEntityType;
    targetId: string;
  } {
    if (relationType === WorkRelationType.MITIGATES) {
      // MITIGATES canonical direction: TASK is source, RISK is target.
      // Flip if caller submitted RISK→TASK.
      if (
        sourceType === WorkEntityType.RISK &&
        targetType === WorkEntityType.TASK
      ) {
        return {
          sourceType: targetType,
          sourceId: targetId,
          targetType: sourceType,
          targetId: sourceId,
        };
      }
      return { sourceType, sourceId, targetType, targetId };
    }

    if (relationType === WorkRelationType.RELATES_TO) {
      // RELATES_TO is symmetric — sort to canonical order so reversed pairs
      // produce the same row and hit the unique constraint.
      const a = { type: sourceType, id: sourceId };
      const b = { type: targetType, id: targetId };
      const [first, second] =
        a.type < b.type || (a.type === b.type && a.id <= b.id)
          ? [a, b]
          : [b, a];
      return {
        sourceType: first.type,
        sourceId: first.id,
        targetType: second.type,
        targetId: second.id,
      };
    }

    return { sourceType, sourceId, targetType, targetId };
  }

  // ── Endpoint resolver ───────────────────────────────────────────────────────

  private async resolveEndpoint(
    entityType: WorkEntityType,
    entityId: string,
    workspaceId: string,
    organizationId: string,
  ): Promise<void> {
    let found: { workspaceId: string; deletedAt?: Date | null } | null = null;

    if (entityType === WorkEntityType.TASK) {
      found = await this.taskRepo.findOne({
        where: { id: entityId, organizationId },
        select: ['workspaceId', 'deletedAt'],
      });
    } else if (entityType === WorkEntityType.RISK) {
      found = await this.riskRepo.findOne({
        where: { id: entityId, organizationId },
        select: ['workspaceId', 'deletedAt'],
      });
    } else if (entityType === WorkEntityType.ARTIFACT) {
      found = await this.artifactItemRepo.findOne({
        where: { id: entityId, organizationId },
        select: ['workspaceId', 'deletedAt'],
      });
    }

    if (!found || found.deletedAt != null) {
      // 404 — do not reveal whether the entity exists in another workspace
      throw new NotFoundException(
        `${entityType} ${entityId} not found or deleted`,
      );
    }
    if (found.workspaceId !== workspaceId) {
      // Cross-workspace link attempt: 404, not 403, to avoid workspace enumeration
      throw new NotFoundException(
        `${entityType} ${entityId} not found in workspace ${workspaceId}`,
      );
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(
    auth: { userId: string; organizationId: string },
    workspaceId: string,
    dto: CreateEntityLinkDto,
  ): Promise<WorkEntityLink> {
    const { sourceEntityType, sourceEntityId, targetEntityType, targetEntityId, relationType } = dto;

    // task↔task → 409 USE_DEPENDENCIES (task-to-task graph lives in work_task_dependencies)
    if (
      sourceEntityType === WorkEntityType.TASK &&
      targetEntityType === WorkEntityType.TASK
    ) {
      throw new ConflictException({
        code: 'USE_DEPENDENCIES',
        message:
          'Task-to-task relationships must use work_task_dependencies, not entity links.',
      });
    }

    // Normalize direction before validation and insert
    const normalized = this.normalizeEndpoints(
      sourceEntityType,
      sourceEntityId,
      targetEntityType,
      targetEntityId,
      relationType,
    );

    // Validate both endpoints: exist, live, same workspace
    await Promise.all([
      this.resolveEndpoint(
        normalized.sourceType,
        normalized.sourceId,
        workspaceId,
        auth.organizationId,
      ),
      this.resolveEndpoint(
        normalized.targetType,
        normalized.targetId,
        workspaceId,
        auth.organizationId,
      ),
    ]);

    const link = this.linkRepo.create({
      organizationId: auth.organizationId,
      workspaceId,
      sourceEntityType: normalized.sourceType,
      sourceEntityId: normalized.sourceId,
      targetEntityType: normalized.targetType,
      targetEntityId: normalized.targetId,
      relationType,
      createdBy: auth.userId,
    });

    try {
      return await this.linkRepo.save(link);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'LINK_ALREADY_EXISTS',
          message: 'A link between these entities with this relation type already exists.',
        });
      }
      throw err;
    }
  }

  async findForWorkspace(
    workspaceId: string,
    organizationId: string,
    entityType?: WorkEntityType,
    entityId?: string,
  ): Promise<WorkEntityLink[]> {
    if (entityType && entityId) {
      // Bidirectional: return links where this entity is source OR target
      return this.linkRepo.find({
        where: [
          {
            workspaceId,
            organizationId,
            sourceEntityType: entityType,
            sourceEntityId: entityId,
          },
          {
            workspaceId,
            organizationId,
            targetEntityType: entityType,
            targetEntityId: entityId,
          },
        ],
        order: { createdAt: 'ASC' },
      });
    }

    return this.linkRepo.find({
      where: { workspaceId, organizationId },
      order: { createdAt: 'ASC' },
    });
  }

  async remove(
    linkId: string,
    workspaceId: string,
    organizationId: string,
  ): Promise<void> {
    const link = await this.linkRepo.findOne({
      where: { id: linkId, workspaceId, organizationId },
    });
    if (!link) {
      throw new NotFoundException(`Entity link ${linkId} not found`);
    }
    await this.linkRepo.remove(link);
  }

  // ── Orphan GC ───────────────────────────────────────────────────────────────

  /**
   * Nightly GC — removes links whose source or target endpoint no longer exists
   * or has been soft-deleted.
   *
   * Endpoint resolution mapping (MIRROR-COMMENT: GC_ENDPOINT_TABLES at top of file):
   *   TASK     → work_tasks             (deleted_at IS NOT NULL = dead)
   *   RISK     → work_risks             (deleted_at IS NOT NULL = dead)
   *   ARTIFACT → project_artifact_items (deleted_at IS NOT NULL = dead)
   *
   * No FK constraints exist on work_entity_links endpoints, so this cron is the
   * sole safety net for referential consistency.
   */
  @Cron(process.env.ENTITY_LINKS_GC_CRON || '0 2 * * *')
  async runOrphanGc(): Promise<void> {
    this.logger.log('entity-links orphan GC: start');

    const allLinks = await this.linkRepo.find({
      select: ['id', 'sourceEntityType', 'sourceEntityId', 'targetEntityType', 'targetEntityId'],
    });

    if (allLinks.length === 0) {
      this.logger.log('entity-links orphan GC: 0 links, nothing to check');
      return;
    }

    const orphanIds: string[] = [];

    for (const link of allLinks) {
      const sourceAlive = await this.isEndpointAlive(link.sourceEntityType, link.sourceEntityId);
      const targetAlive = await this.isEndpointAlive(link.targetEntityType, link.targetEntityId);
      if (!sourceAlive || !targetAlive) {
        orphanIds.push(link.id);
      }
    }

    if (orphanIds.length === 0) {
      this.logger.log('entity-links orphan GC: 0 orphans found');
      return;
    }

    await this.linkRepo.delete({ id: In(orphanIds) });
    this.logger.log(`entity-links orphan GC: deleted ${orphanIds.length} orphan(s)`);
  }

  private async isEndpointAlive(
    entityType: WorkEntityType,
    entityId: string,
  ): Promise<boolean> {
    if (entityType === WorkEntityType.TASK) {
      const row = await this.taskRepo.findOne({
        where: { id: entityId },
        select: ['id', 'deletedAt'],
      });
      return row !== null && row.deletedAt === null;
    }
    if (entityType === WorkEntityType.RISK) {
      const row = await this.riskRepo.findOne({
        where: { id: entityId },
        select: ['id', 'deletedAt'],
      });
      return row !== null && row.deletedAt === null;
    }
    if (entityType === WorkEntityType.ARTIFACT) {
      const row = await this.artifactItemRepo.findOne({
        where: { id: entityId },
        select: ['id', 'deletedAt'],
      });
      return row !== null && row.deletedAt === null;
    }
    return false;
  }

  /** Exposed for manual GC runs in tests and ops scripts. */
  async runGcForLink(linkId: string): Promise<boolean> {
    const link = await this.linkRepo.findOne({
      where: { id: linkId },
      select: ['id', 'sourceEntityType', 'sourceEntityId', 'targetEntityType', 'targetEntityId'],
    });
    if (!link) return false;

    const sourceAlive = await this.isEndpointAlive(link.sourceEntityType, link.sourceEntityId);
    const targetAlive = await this.isEndpointAlive(link.targetEntityType, link.targetEntityId);

    if (!sourceAlive || !targetAlive) {
      await this.linkRepo.delete({ id: linkId });
      return true;
    }
    return false;
  }
}
