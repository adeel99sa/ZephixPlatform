import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Resource } from './resource.entity';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

@Entity('resource_conflicts')
@Index('idx_resource_conflicts_org', ['organizationId'])
@Index('idx_resource_conflicts_resource', ['resourceId'])
@Index('idx_resource_conflicts_resolved', ['resolved'])
export class ResourceConflict {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;
  
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;
  
  @Column({ name: 'week_start', type: 'date' })
  weekStart: Date;
  
  @Column({ name: 'allocation_percentage', type: 'integer' })
  allocationPercentage: number;
  
  @Column({ name: 'conflict_type', type: 'varchar', length: 20 })
  conflictType: 'warning' | 'critical' | 'over_max';
  
  @Column({ name: 'resolved', type: 'boolean', default: false })
  resolved: boolean;
  
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;
  
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  
  // Relations
  @ManyToOne(() => Resource)
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;
  
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;
  
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}