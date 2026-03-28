import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'project_budgets' })
@Index(['workspaceId', 'projectId'], { unique: true })
export class ProjectBudgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'baseline_budget' })
  baselineBudget!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'revised_budget' })
  revisedBudget!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  contingency!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'approved_change_budget' })
  approvedChangeBudget!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'forecast_at_completion' })
  forecastAtCompletion!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
