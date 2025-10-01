import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEvent {
  correlationId?: string;
  userId?: string;
  organizationId?: string;
  action: string;
  target?: string;
  result?: 'success' | 'failure' | 'error';
  ip?: string;
  userAgent?: string;
  metadata?: any;
  email?: string;
  workspaceId?: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  newValues?: any;
  oldValues?: any;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async log(event: AuditEvent): Promise<void> {
    const entry = {
      timestamp: new Date(),
      correlationId: event.correlationId || uuidv4(),
      actorId: event.userId || 'anonymous',
      organizationId: event.organizationId,
      action: event.action,
      target: event.target,
        result: event.result || 'success',
      ip: event.ip,
      userAgent: event.userAgent,
      metadata: this.sanitizeMetadata(event.metadata),
    };

    try {
      // Append-only insert
      await this.auditRepository.insert(entry);
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw - audit failures shouldn't break the application
    }
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata) return null;
    
    // Remove PII and sensitive data
    const sanitized = { ...metadata };
    delete sanitized.password;
    delete sanitized.ssn;
    delete sanitized.creditCard;
    delete sanitized.token;
    delete sanitized.secret;
    
    return sanitized;
  }

  async getAuditLogs(
    organizationId: string,
    limit: number = 100,
    offset: number = 0,
    action?: string,
    userId?: string
  ): Promise<AuditLog[]> {
    const query = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.organizationId = :organizationId', { organizationId })
      .orderBy('audit.timestamp', 'DESC')
      .limit(limit)
      .offset(offset);

    if (action) {
      query.andWhere('audit.action = :action', { action });
    }

    if (userId) {
      query.andWhere('audit.actorId = :userId', { userId });
    }

    return query.getMany();
  }

  async getSecurityEvents(
    organizationId: string,
    hours: number = 24
  ): Promise<{ event: string; count: number }[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const query = this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'event')
      .addSelect('COUNT(*)', 'count')
      .where('audit.organizationId = :organizationId', { organizationId })
      .andWhere('audit.timestamp >= :since', { since })
      .andWhere('audit.result = :result', { result: 'failure' })
      .groupBy('audit.action')
      .orderBy('count', 'DESC');

    return query.getRawMany();
  }

  async checkFailureSpike(
    organizationId: string,
    action: string,
    threshold: number = 20,
    minutes: number = 5
  ): Promise<boolean> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    const count = await this.auditRepository.count({
      where: {
        organizationId,
        action,
        result: 'failure',
        timestamp: MoreThan(since),
      },
    });

    return count > threshold;
  }
}