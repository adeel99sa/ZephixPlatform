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
import { PhaseGateDefinition } from './phase-gate-definition.entity';
import { GateCycleState } from '../enums/gate-cycle-state.enum';

@Entity('gate_cycles')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['phaseGateDefinitionId'])
export class GateCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'phase_gate_definition_id', type: 'uuid' })
  phaseGateDefinitionId: string;

  /** 1-based sequence per gate definition (new cycle on resubmit / recycle). */
  @Column({ name: 'cycle_number', type: 'int', default: 1 })
  cycleNumber: number;

  @Column({
    name: 'cycle_state',
    type: 'varchar',
    length: 20,
    default: GateCycleState.OPEN,
  })
  cycleState: GateCycleState;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => PhaseGateDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phase_gate_definition_id' })
  phaseGateDefinition: PhaseGateDefinition;
}
