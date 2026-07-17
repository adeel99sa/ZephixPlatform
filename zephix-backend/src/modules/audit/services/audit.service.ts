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

  // SEC-4 fail-honest state. record() intentionally swallows so a failed audit
  // write never breaks the caller's action — but a receipt loss must be
  // VISIBLE, not a silent return: a self-throttled ERROR while degraded, and a
  // gap receipt (AUDIT_WRITE_RECOVERED) written the moment the trail is
  // writable again. Same start/recovery grain as SEC-3's Redis pattern.
  private auditDegraded = false;
  private auditDegradedSinceMs: number | null = null;
  private auditFailedWrites = 0;
  private lastFailLogMs = 0;
  private static readonly FAIL_LOG_INTERVAL_MS = 60_000;
  private static readonly SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';

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
    const event = this.buildAuditEvent(input);
    try {
      const saved = options?.manager
        ? await options.manager.save(AuditEvent, event)
        : await this.repo.save(event);
      await this.onAuditWriteRecovered();
      return saved;
    } catch (err) {
      // Fail-honest (SEC-4): the caller's action still succeeds (we return the
      // unsaved event), but the loss is announced — throttled ERROR now, gap
      // receipt on recovery — never a silent return.
      this.onAuditWriteFailed(input, err as Error);
      return event;
    }
  }

  /** SEC-4: a write failed — track the gap and log at ERROR, self-throttled. */
  private onAuditWriteFailed(input: AuditRecordInput, error: Error): void {
    this.auditFailedWrites += 1;
    if (!this.auditDegraded) {
      this.auditDegraded = true;
      this.auditDegradedSinceMs = Date.now();
    }
    const now = Date.now();
    if (
      this.auditFailedWrites === 1 ||
      now - this.lastFailLogMs > AuditService.FAIL_LOG_INTERVAL_MS
    ) {
      this.lastFailLogMs = now;
      this.logger.error(
        `AUDIT_WRITE_FAILED | action=${input.action} entityType=${input.entityType} entityId=${input.entityId} org=${input.organizationId} actor=${input.actorUserId} | failedWrites=${this.auditFailedWrites} | ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * SEC-4: called after every successful write. If we were degraded, write ONE
   * gap receipt recording the window + count of lost writes, then re-arm. The
   * receipt goes through the default repo (not the caller's manager) so it is
   * an independent system observation, and NOT through record() so it cannot
   * recurse.
   */
  private async onAuditWriteRecovered(): Promise<void> {
    if (!this.auditDegraded) return;
    const degradedSinceMs = this.auditDegradedSinceMs;
    const failedWrites = this.auditFailedWrites;
    this.auditDegraded = false;
    this.auditDegradedSinceMs = null;
    this.auditFailedWrites = 0;
    try {
      const receipt = this.buildAuditEvent({
        organizationId: AuditService.SYSTEM_UUID,
        actorUserId: AuditService.SYSTEM_UUID,
        actorPlatformRole: 'SYSTEM',
        entityType: AuditEntityType.SECURITY,
        entityId: AuditService.SYSTEM_UUID,
        action: AuditAction.AUDIT_WRITE_RECOVERED,
        metadata: {
          component: 'audit-service',
          degradedSinceMs,
          recoveredAtMs: Date.now(),
          failedWrites,
        },
      });
      await this.repo.save(receipt);
      this.logger.warn(
        `AUDIT_WRITE_RECOVERED | audit writes resumed after ${failedWrites} swallowed failure(s); gap receipt written`,
      );
    } catch (err) {
      // Trail still flaky — re-arm so the next success retries the receipt
      // rather than losing the episode entirely.
      this.auditDegraded = true;
      this.auditDegradedSinceMs = degradedSinceMs;
      this.auditFailedWrites = failedWrites;
      this.logger.error(
        `AUDIT_WRITE_RECOVERED receipt failed to persist; will retry on next successful write | ${(err as Error).message}`,
      );
    }
  }

  private buildAuditEvent(input: AuditRecordInput): AuditEvent {
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
    event.userAgent = input.userAgent ? input.userAgent.substring(0, 512) : null;
    return event;
  }

  /**
   * Fail-closed audit write for governance-critical paths.
   * Unlike {@link AuditService.record}, persistence failures are logged and re-thrown
   * so the caller surfaces a 500 rather than silently proceeding without a receipt.
   * Use this wherever a missing audit row would constitute an undetected control bypass.
   */
  async recordOrThrow(
    input: AuditRecordInput,
    options?: { manager?: EntityManager },
  ): Promise<AuditEvent> {
    const event = this.buildAuditEvent(input);
    try {
      if (options?.manager) {
        return await options.manager.save(AuditEvent, event);
      }
      return await this.repo.save(event);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `AUDIT_WRITE_FAILED (required) | action=${input.action} entityType=${input.entityType} entityId=${input.entityId} org=${input.organizationId} actor=${input.actorUserId} | ${error.message}`,
        error.stack,
      );
      throw err;
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
