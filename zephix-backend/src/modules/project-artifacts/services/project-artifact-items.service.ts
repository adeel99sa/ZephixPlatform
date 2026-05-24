import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';
import {
  CustomFieldDefinition,
  ProjectArtifact,
} from '../entities/project-artifact.entity';
import { ProjectArtifactItem } from '../entities/project-artifact-item.entity';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';
import {
  BulkCreateItemsDto,
  BulkItemValidationError,
} from '../dto/bulk-create-items.dto';
import { ArtifactServiceAuth } from './project-artifacts.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T.+)?$/;

export interface ListItemsFilters {
  status?: string;
  assignee?: string;
  page?: number;
  limit?: number;
}

export interface ListItemsResult {
  items: ProjectArtifactItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BulkCreateItemsResult {
  items: ProjectArtifactItem[];
  errors: BulkItemValidationError[];
}

@Injectable()
export class ProjectArtifactItemsService {
  private readonly logger = new Logger(ProjectArtifactItemsService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(ProjectArtifact))
    private readonly artifactRepo: TenantAwareRepository<ProjectArtifact>,
    @Inject(getTenantAwareRepositoryToken(ProjectArtifactItem))
    private readonly itemRepo: TenantAwareRepository<ProjectArtifactItem>,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  private async loadArtifact(artifactId: string): Promise<ProjectArtifact> {
    const artifact = await this.artifactRepo.findOne({
      where: { id: artifactId, deletedAt: IsNull() },
    });
    if (!artifact) {
      throw new NotFoundException({
        code: 'ARTIFACT_NOT_FOUND',
        message: `Artifact ${artifactId} not found`,
      });
    }
    return artifact;
  }

  async create(
    artifactId: string,
    dto: CreateItemDto,
    auth: ArtifactServiceAuth,
  ): Promise<ProjectArtifactItem> {
    const artifact = await this.loadArtifact(artifactId);
    const values = dto.customFieldValues ?? {};
    this.validateCustomFieldValues(artifact.customFieldDefinitions, values, -1);

    const item = await this.itemRepo.save({
      organizationId: artifact.organizationId,
      workspaceId: artifact.workspaceId,
      artifactId: artifact.id,
      name: dto.name,
      content: dto.content ?? {},
      statusId: dto.statusId ?? null,
      assigneeId: dto.assigneeId ?? null,
      priority: dto.priority ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      customFieldValues: values,
      position: dto.position ?? 0,
      parentItemId: dto.parentItemId ?? null,
      createdBy: auth.userId,
    });

    await this.emitAudit(AuditAction.CREATE, item, auth, {
      after: this.itemSnapshot(item),
      metadata: { kind: 'create', artifactId },
    });
    return item;
  }

  async findAllForArtifact(
    artifactId: string,
    filters: ListItemsFilters = {},
  ): Promise<ListItemsResult> {
    await this.loadArtifact(artifactId);

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, filters.limit ?? 50));

    const where: Record<string, unknown> = {
      artifactId,
      deletedAt: IsNull(),
    };
    if (filters.status) where.statusId = filters.status;
    if (filters.assignee) where.assigneeId = filters.assignee;

    const [items, total] = await this.itemRepo.findAndCount({
      where,
      order: { position: 'ASC', createdAt: 'ASC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    return { items, total, page, pageSize };
  }

  async findOne(
    artifactId: string,
    itemId: string,
  ): Promise<ProjectArtifactItem> {
    await this.loadArtifact(artifactId);
    const item = await this.itemRepo.findOne({
      where: { id: itemId, artifactId, deletedAt: IsNull() },
    });
    if (!item) {
      throw new NotFoundException({
        code: 'ARTIFACT_ITEM_NOT_FOUND',
        message: `Item ${itemId} not found in artifact ${artifactId}`,
      });
    }
    return item;
  }

  async update(
    artifactId: string,
    itemId: string,
    dto: UpdateItemDto,
    auth: ArtifactServiceAuth,
  ): Promise<ProjectArtifactItem> {
    const artifact = await this.loadArtifact(artifactId);
    const existing = await this.findOne(artifactId, itemId);
    const before = this.itemSnapshot(existing);

    if (dto.customFieldValues !== undefined) {
      this.validateCustomFieldValues(
        artifact.customFieldDefinitions,
        dto.customFieldValues,
        -1,
      );
    }

    Object.assign(existing, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.content !== undefined ? { content: dto.content } : {}),
      ...(dto.statusId !== undefined ? { statusId: dto.statusId } : {}),
      ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.dueDate !== undefined
        ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
        : {}),
      ...(dto.customFieldValues !== undefined
        ? { customFieldValues: dto.customFieldValues }
        : {}),
      ...(dto.position !== undefined ? { position: dto.position } : {}),
      ...(dto.parentItemId !== undefined
        ? { parentItemId: dto.parentItemId }
        : {}),
    });

    const updated = await this.itemRepo.save(existing);
    await this.emitAudit(AuditAction.UPDATE, updated, auth, {
      before,
      after: this.itemSnapshot(updated),
      metadata: { kind: 'update', artifactId },
    });
    return updated;
  }

  async softDelete(
    artifactId: string,
    itemId: string,
    auth: ArtifactServiceAuth,
  ): Promise<void> {
    const existing = await this.findOne(artifactId, itemId);
    await this.itemRepo.update({ id: itemId }, { deletedAt: new Date() });
    await this.emitAudit(AuditAction.DELETE, existing, auth, {
      before: this.itemSnapshot(existing),
      metadata: { kind: 'delete', artifactId },
    });
  }

  async reorder(
    artifactId: string,
    itemIds: string[],
    auth: ArtifactServiceAuth,
  ): Promise<void> {
    const artifact = await this.loadArtifact(artifactId);

    const existing = await this.itemRepo.find({
      where: { id: In(itemIds), artifactId, deletedAt: IsNull() },
      select: ['id'],
    });
    if (existing.length !== itemIds.length) {
      throw new BadRequestException({
        code: 'ITEM_REORDER_MISMATCH',
        message: 'One or more itemIds do not belong to this artifact',
      });
    }

    await Promise.all(
      itemIds.map((id, position) => this.itemRepo.update({ id }, { position })),
    );

    await this.emitAudit(
      AuditAction.UPDATE,
      {
        id: artifact.id,
        organizationId: artifact.organizationId,
        workspaceId: artifact.workspaceId,
      } as ProjectArtifactItem,
      auth,
      {
        metadata: { kind: 'reorder', artifactId, itemIds },
      },
    );
  }

  async bulkCreate(
    artifactId: string,
    dto: BulkCreateItemsDto,
    auth: ArtifactServiceAuth,
  ): Promise<BulkCreateItemsResult> {
    const artifact = await this.loadArtifact(artifactId);
    const errors: BulkItemValidationError[] = [];
    const validRows: Array<{ index: number; dto: CreateItemDto }> = [];

    dto.items.forEach((itemDto, index) => {
      try {
        this.validateCustomFieldValues(
          artifact.customFieldDefinitions,
          itemDto.customFieldValues ?? {},
          index,
        );
        validRows.push({ index, dto: itemDto });
      } catch (err) {
        const message = (err as Error).message;
        const field = (err as { fieldId?: string }).fieldId;
        errors.push({ index, field, message });
      }
    });

    const inserted = await Promise.all(
      validRows.map(({ dto: itemDto }, ordinal) =>
        this.itemRepo.save({
          organizationId: artifact.organizationId,
          workspaceId: artifact.workspaceId,
          artifactId: artifact.id,
          name: itemDto.name,
          content: itemDto.content ?? {},
          statusId: itemDto.statusId ?? null,
          assigneeId: itemDto.assigneeId ?? null,
          priority: itemDto.priority ?? null,
          dueDate: itemDto.dueDate ? new Date(itemDto.dueDate) : null,
          customFieldValues: itemDto.customFieldValues ?? {},
          position: itemDto.position ?? ordinal,
          parentItemId: itemDto.parentItemId ?? null,
          createdBy: auth.userId,
        }),
      ),
    );

    for (const item of inserted) {
      await this.emitAudit(AuditAction.CREATE, item, auth, {
        after: this.itemSnapshot(item),
        metadata: { kind: 'bulk_create', artifactId },
      });
    }

    return { items: inserted, errors };
  }

  // ── Helpers ────────────────────────────────────────────────────────

  /**
   * Per-row validation of custom_field_values against the artifact's
   * custom_field_definitions. Throws BadRequestException on first failure.
   * `rowIndex` is included in the message for bulk error mapping; pass -1
   * for single-item endpoints.
   */
  private validateCustomFieldValues(
    definitions: CustomFieldDefinition[] | null | undefined,
    values: Record<string, unknown>,
    rowIndex: number,
  ): void {
    const defs = definitions ?? [];
    for (const def of defs) {
      const raw = values[def.id];
      const present = raw !== undefined && raw !== null && raw !== '';

      if (def.required && !present) {
        this.fail(
          rowIndex,
          def.id,
          `Field "${def.name}" (${def.id}) is required`,
        );
      }
      if (!present) continue;

      switch (def.type) {
        case 'text':
          if (typeof raw !== 'string') {
            this.fail(rowIndex, def.id, `Field "${def.name}" must be a string`);
          }
          break;
        case 'number':
        case 'rating':
        case 'currency':
          if (typeof raw !== 'number' || Number.isNaN(raw)) {
            this.fail(rowIndex, def.id, `Field "${def.name}" must be a number`);
          }
          if (def.type === 'rating' && raw > 5) {
            this.fail(
              rowIndex,
              def.id,
              `Field "${def.name}" rating must be ≤ 5`,
            );
          }
          break;
        case 'date':
          if (typeof raw !== 'string' || !ISO_DATE_RE.test(raw)) {
            this.fail(
              rowIndex,
              def.id,
              `Field "${def.name}" must be an ISO date string (YYYY-MM-DD or full ISO)`,
            );
          }
          break;
        case 'enum':
          if (
            typeof raw !== 'string' ||
            !(def.enumValues ?? []).includes(raw)
          ) {
            this.fail(
              rowIndex,
              def.id,
              `Field "${def.name}" must be one of [${(def.enumValues ?? []).join(', ')}]; got ${JSON.stringify(raw)}`,
            );
          }
          break;
        case 'person':
          if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
            this.fail(rowIndex, def.id, `Field "${def.name}" must be a UUID`);
          }
          break;
      }
    }
  }

  private fail(rowIndex: number, fieldId: string, message: string): never {
    const prefix = rowIndex >= 0 ? `Row ${rowIndex}: ` : '';
    const err = new BadRequestException({
      code: 'CUSTOM_FIELD_VALIDATION',
      field: fieldId,
      message: `${prefix}${message}`,
    });
    (err as unknown as { fieldId: string }).fieldId = fieldId;
    throw err;
  }

  private itemSnapshot(item: ProjectArtifactItem): Record<string, unknown> {
    return {
      id: item.id,
      artifactId: item.artifactId,
      name: item.name,
      statusId: item.statusId ?? null,
      assigneeId: item.assigneeId ?? null,
      priority: item.priority ?? null,
      dueDate: item.dueDate ?? null,
      position: item.position,
      parentItemId: item.parentItemId ?? null,
    };
  }

  private async emitAudit(
    action: AuditAction,
    item: ProjectArtifactItem,
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
        organizationId: item.organizationId || auth.organizationId,
        workspaceId: item.workspaceId || null,
        actorUserId: auth.userId,
        actorPlatformRole: auth.platformRole || 'USER',
        entityType: AuditEntityType.PROJECT_ARTIFACT_ITEM,
        entityId: item.id,
        action,
        before: extras.before ?? null,
        after: extras.after ?? null,
        metadata: extras.metadata ?? null,
      });
    } catch (err) {
      this.logger.warn(
        `audit emit failed action=${action} itemId=${item.id}: ${(err as Error).message}`,
      );
    }
  }
}
