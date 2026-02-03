import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { AuditEvent } from '../../work-management/entities/audit-event.entity';

export interface EmitAuditParams {
  eventType: string;
  entityType: string;
  entityId: string | null;
  userId: string;
  workspaceId?: string | null;
  projectId?: string | null;
  oldState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

/**
 * Template Center audit: writes to shared audit_events table.
 * Keeps payload small; no secrets.
 */
@Injectable()
export class TemplateCenterAuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  async emit(params: EmitAuditParams): Promise<void> {
    const data = {
      workspaceId: params.workspaceId ?? null,
      projectId: params.projectId ?? null,
      userId: params.userId,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      oldState: params.oldState ?? null,
      newState: params.newState ?? null,
      metadata: params.metadata ?? null,
    } as DeepPartial<AuditEvent>;
    const row = this.auditRepo.create(data);
    await this.auditRepo.save(row);
  }
}
