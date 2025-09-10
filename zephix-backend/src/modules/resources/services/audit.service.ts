import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async logAction(params: {
    userId: string;
    organizationId: string;
    entityType: string;
    entityId?: string;
    action: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<void> {
    // Add debug logging
    console.log('🔍 AUDIT: logAction called with:', {
      userId: params.userId,
      organizationId: params.organizationId,
      action: params.action,
      entityType: params.entityType
    });

    // Validate required fields
    if (!params.userId || !params.organizationId) {
      console.error('❌ AUDIT: Missing required fields');
      return;
    }

    try {
      // Create audit entry
      const auditEntry = this.auditRepository.create({
        userId: params.userId,
        organizationId: params.organizationId,
        entityType: params.entityType,
        entityId: params.entityId || null,
        action: params.action,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress || 'unknown',
        userAgent: params.userAgent || 'unknown',
        requestId: params.requestId || null,
      });

      // Save to database
      const saved = await this.auditRepository.save(auditEntry);
      console.log('✅ AUDIT: Saved with ID:', saved.id);
    } catch (error) {
      console.error('❌ AUDIT: Save failed:', error.message);
      // Don't throw - audit shouldn't break the app
    }
  }

  async getAuditLogs(organizationId: string, filters?: {
    entityType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]> {
    const query = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.organization_id = :organizationId', { organizationId })
      .orderBy('audit.created_at', 'DESC');

    if (filters?.entityType) {
      query.andWhere('audit.entity_type = :entityType', { entityType: filters.entityType });
    }

    if (filters?.userId) {
      query.andWhere('audit.user_id = :userId', { userId: filters.userId });
    }

    if (filters?.startDate) {
      query.andWhere('audit.created_at >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('audit.created_at <= :endDate', { endDate: filters.endDate });
    }

    return query.getMany();
  }
}
