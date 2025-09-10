import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: any;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: any;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

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
    try {
      const auditEntry = this.auditRepository.create({
        userId: params.userId,
        organizationId: params.organizationId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
      });

      await this.auditRepository.save(auditEntry);
      console.log(`Audit logged: ${params.action} on ${params.entityType}`);
    } catch (error) {
      console.error('Failed to log audit:', error);
      // Don't throw - audit failure shouldn't break the operation
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
