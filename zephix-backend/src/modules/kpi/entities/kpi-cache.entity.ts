import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('kpi_cache')
@Index(['entityType', 'entityId'], { unique: true })
@Index(['calculatedAt'])
@Index(['expiresAt'])
export class KPICache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: 'task' | 'project' | 'workspace' | 'program' | 'organization';

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'kpi_data', type: 'jsonb' })
  kpiData: any;

  @CreateDateColumn({ name: 'calculated_at' })
  calculatedAt: Date;

  @Column({ name: 'hierarchy_path', type: 'text', nullable: true })
  hierarchyPath: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}








