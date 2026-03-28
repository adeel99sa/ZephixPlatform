import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GateCycle } from './gate-cycle.entity';
import { GateConditionStatus } from '../enums/gate-condition-status.enum';

@Entity('gate_conditions')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['gateCycleId'])
export class GateCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'gate_cycle_id', type: 'uuid' })
  gateCycleId: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  label: string;

  @Column({
    name: 'condition_status',
    type: 'varchar',
    length: 20,
    default: GateConditionStatus.PENDING,
  })
  conditionStatus: GateConditionStatus;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => GateCycle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gate_cycle_id' })
  gateCycle: GateCycle;
}
