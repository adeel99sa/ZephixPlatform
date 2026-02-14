import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, SelectQueryBuilder } from 'typeorm';
import { AuditEvent } from '../entities/audit-event.entity';
import { AuditEntityType, AuditAction, SANITIZE_KEYS } from '../audit.constants';

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
  entityId?: string;
  action?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
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
      // Audit must never break the business flow
      this.logger.error({
        context: 'AUDIT_WRITE_FAILED',
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        error: (err as Error).message,
      });
      return event; // Return unsaved event — caller does not fail
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
    if (opts.entityType) {
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
