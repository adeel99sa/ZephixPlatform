import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ScenarioPlan } from './scenario-plan.entity';

export type ScenarioActionType =
  | 'shift_project'
  | 'shift_task'
  | 'change_capacity'
  | 'change_budget';

/**
 * Payload shapes per action_type:
 *
 * shift_project:   { projectId: string, shiftDays: number }
 * shift_task:      { taskId: string, shiftDays: number }
 * change_capacity: { userId: string, date: string, capacityHours: number }
 * change_budget:   { projectId: string, newBudget: number }
 */
export interface ScenarioActionPayload {
  projectId?: string;
  taskId?: string;
  userId?: string;
  shiftDays?: number;
  date?: string;
  capacityHours?: number;
  newBudget?: number;
}

@Entity('scenario_actions')
@Index('IDX_scenario_actions_org', ['organizationId'])
@Index('IDX_scenario_actions_scenario', ['scenarioId'])
export class ScenarioAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'scenario_id' })
  scenarioId: string;

  @Column({ type: 'varchar', length: 30, name: 'action_type' })
  actionType: ScenarioActionType;

  @Column({ type: 'jsonb', default: {} })
  payload: ScenarioActionPayload;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ScenarioPlan, (s) => s.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scenario_id' })
  scenario: ScenarioPlan;
}
