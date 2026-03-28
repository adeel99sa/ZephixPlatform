import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { ScenarioAction } from './scenario-action.entity';
import { ScenarioResult } from './scenario-result.entity';

export type ScenarioScopeType = 'portfolio' | 'project';
export type ScenarioStatus = 'draft' | 'active';

@Entity('scenario_plans')
@Index('IDX_scenario_plans_org_ws', ['organizationId', 'workspaceId'])
@Index('IDX_scenario_plans_org_ws_scope', [
  'organizationId',
  'workspaceId',
  'scopeType',
  'scopeId',
])
export class ScenarioPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, name: 'scope_type', default: 'project' })
  scopeType: ScenarioScopeType;

  @Column({ type: 'uuid', name: 'scope_id' })
  scopeId: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: ScenarioStatus;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => ScenarioAction, (a) => a.scenario, { cascade: true })
  actions: ScenarioAction[];

  @OneToOne(() => ScenarioResult, (r) => r.scenario)
  result: ScenarioResult;
}
