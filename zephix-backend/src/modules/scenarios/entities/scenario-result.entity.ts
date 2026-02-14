import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ScenarioPlan } from './scenario-plan.entity';

/**
 * Scenario compute result — one row per scenario (upsert via unique constraint).
 */
export interface ScenarioSummary {
  // Before state
  before: {
    totalCapacityHours: number;
    totalDemandHours: number;
    overallocatedDays: number;
    overallocatedUsers: number;
    aggregateCPI: number | null;
    aggregateSPI: number | null;
    criticalPathSlipMinutes: number;
    baselineDriftMinutes: number;
  };
  // After state (with actions applied)
  after: {
    totalCapacityHours: number;
    totalDemandHours: number;
    overallocatedDays: number;
    overallocatedUsers: number;
    aggregateCPI: number | null;
    aggregateSPI: number | null;
    criticalPathSlipMinutes: number;
    baselineDriftMinutes: number;
  };
  // Deltas
  deltas: {
    overallocatedDaysDelta: number;
    overallocatedUsersDelta: number;
    cpiDelta: number | null;
    spiDelta: number | null;
    criticalPathSlipDelta: number;
    baselineDriftDelta: number;
  };
  // Top impacted projects
  impactedProjects: Array<{
    projectId: string;
    projectName: string;
    impactSummary: string;
  }>;
}

@Entity('scenario_results')
@Unique('UQ_scenario_results_scenario', ['scenarioId'])
@Index('IDX_scenario_results_org', ['organizationId'])
export class ScenarioResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'scenario_id' })
  scenarioId: string;

  @Column({ type: 'timestamptz', name: 'computed_at', default: () => 'now()' })
  computedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  summary: ScenarioSummary;

  @Column({ type: 'jsonb', default: [] })
  warnings: string[];

  @OneToOne(() => ScenarioPlan, (s) => s.result, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scenario_id' })
  scenario: ScenarioPlan;
}
