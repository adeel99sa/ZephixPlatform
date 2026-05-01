import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, SelectQueryBuilder } from 'typeorm';
import { AuditEvent } from '../entities/audit-event.entity';
import { AuditEntityType, AuditAction, SANITIZE_KEYS } from '../audit.constants';
import type { GuardAuditEventInput } from '../dto/guard-audit-event.input';
import { resolveGuardAuditEntityId } from '../../../common/audit/guard-audit.utils';

/** Input for recording an audit event */
export interface AuditRecordInput {
  organizationId: string;
  workspaceId?: string | null;
  actorUserId: string;
  actorPlatformRole: string;
  actorWorkspaceRole?: string | null;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditQueryOpts {
  organizationId: string;
  workspaceId?: string;
  entityType?: string;
  /** When set, restricts to any of these entity types (takes precedence over entityType). */
  entityTypes?: string[];
  entityId?: string;
  action?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  /** Case-insensitive match on action, entity type, or entity id text. */
  search?: string;
  page: number;
  pageSize: number;
}

/**
 * Phase 3B: Append-only audit service.
 * Supports transactional writes via EntityManager.
 * Sanitizes all JSONB payloads before persistence.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditEvent)
    private readonly repo: Repository<AuditEvent>,
  ) {}

  /**
   * Record an audit event.
   * If options.manager is provided, uses that EntityManager (transactional write).
   * Otherwise uses the default repository.
   */
  async record(
    input: AuditRecordInput,
    options?: { manager?: EntityManager },
  ): Promise<AuditEvent> {
    const event = new AuditEvent();
    event.organizationId = input.organizationId;
    event.workspaceId = input.workspaceId ?? null;
    event.actorUserId = input.actorUserId;
    event.actorPlatformRole = input.actorPlatformRole || 'SYSTEM';
    event.actorWorkspaceRole = input.actorWorkspaceRole ?? null;
    event.entityType = input.entityType;
    event.entityId = input.entityId;
    event.action = input.action;
    event.beforeJson = sanitizeJson(input.before) ?? null;
    event.afterJson = sanitizeJson(input.after) ?? null;
    event.metadataJson = sanitizeJson(input.metadata) ?? null;
    event.ipAddress = input.ipAddress ?? null;
    event.userAgent = input.userAgent
      ? input.userAgent.substring(0, 512)
      : null;

    try {
      if (options?.manager) {
        return await options.manager.save(AuditEvent, event);
      }
      return await this.repo.save(event);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `AUDIT_WRITE_FAILED | action=${input.action} entityType=${input.entityType} entityId=${input.entityId} org=${input.organizationId} actor=${input.actorUserId} | ${error.message}`,
        error.stack,
      );
      return event;
    }
  }

  /**
   * AD-027 Section 12.2 — strict guard authorization audit write.
   *
   * Unlike {@link AuditService.record}, persistence failures are logged and **rethrown**
   * so callers cannot treat a failed write as successful.
   */
  async recordGuardEvent(input: GuardAuditEventInput): Promise<AuditEvent> {
    const entityId = resolveGuardAuditEntityId(input);
    const action =
      input.decision === 'ALLOW'
        ? AuditAction.GUARD_ALLOW
        : AuditAction.GUARD_DENY;
    const metadata = sanitizeJson({
      endpoint: input.endpoint,
      denyReason: input.denyReason,
      requiredRole: input.requiredRole,
      correlationId: input.correlationId,
    });

    const event = new AuditEvent();
    event.organizationId = input.organizationId;
    event.workspaceId = input.workspaceId ?? null;
    event.actorUserId = input.actorUserId;
    event.actorPlatformRole = input.actorPlatformRole;
    event.actorWorkspaceRole = input.actorWorkspaceRole ?? null;
    event.entityType = AuditEntityType.AUTHORIZATION_DECISION;
    event.entityId = entityId;
    event.action = action;
    event.beforeJson = null;
    event.afterJson = null;
    event.metadataJson = metadata;

    try {
      return await this.repo.save(event);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `GUARD_AUDIT_WRITE_FAILED | decision=${input.decision} action=${action} entityId=${entityId} org=${input.organizationId} actor=${input.actorUserId} | ${error.message}`,
        error.stack,
      );
      throw err;
    }
  }

  /**
   * Query audit events with pagination, scoping, and filters.
   */
  async query(opts: AuditQueryOpts): Promise<{ items: AuditEvent[]; total: number }> {
    const qb = this.repo.createQueryBuilder('ae');
    qb.where('ae.organizationId = :organizationId', { organizationId: opts.organizationId });

    if (opts.workspaceId) {
      qb.andWhere('ae.workspaceId = :workspaceId', { workspaceId: opts.workspaceId });
    }
    if (opts.entityTypes?.length) {
      qb.andWhere('ae.entityType IN (:...entityTypes)', {
        entityTypes: opts.entityTypes,
      });
    } else if (opts.entityType) {
      qb.andWhere('ae.entityType = :entityType', { entityType: opts.entityType });
    }
    if (opts.entityId) {
      qb.andWhere('ae.entityId = :entityId', { entityId: opts.entityId });
    }
    if (opts.action) {
      qb.andWhere('ae.action = :action', { action: opts.action });
    }
    if (opts.actorUserId) {
      qb.andWhere('ae.actorUserId = :actorUserId', { actorUserId: opts.actorUserId });
    }
    if (opts.from) {
      qb.andWhere('ae.createdAt >= :from', { from: opts.from });
    }
    if (opts.to) {
      qb.andWhere('ae.createdAt <= :to', { to: opts.to });
    }
    if (opts.search?.trim()) {
      const raw = opts.search.trim().replace(/\\/g, '').replace(/%/g, '');
      const s = `%${raw}%`;
      qb.andWhere(
        '(CAST(ae.action AS text) ILIKE :auditSearch OR CAST(ae.entityType AS text) ILIKE :auditSearch OR CAST(ae.entityId AS text) ILIKE :auditSearch)',
        { auditSearch: s },
      );
    }

    qb.orderBy('ae.createdAt', 'DESC');
    qb.skip((opts.page - 1) * opts.pageSize);
    qb.take(opts.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}

// ── Sanitization ──────────────────────────────────────────────────────

/**
 * Shallow-sanitize a JSON object: strip keys that match forbidden patterns.
 * Returns null if input is null/undefined.
 */
export function sanitizeJson(
  input: Record<string, any> | null | undefined,
): Record<string, any> | null {
  if (!input || typeof input !== 'object') return null;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SANITIZE_KEYS.has(key)) continue;
    if (SANITIZE_KEYS.has(key.toLowerCase())) continue;
    // Check if key contains a forbidden substring
    const lk = key.toLowerCase();
    let forbidden = false;
    for (const sk of SANITIZE_KEYS) {
      if (lk.includes(sk.toLowerCase())) {
        forbidden = true;
        break;
      }
    }
    if (forbidden) continue;
    result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : null;
}
