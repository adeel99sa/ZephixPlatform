import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum ScopeType {
  SYSTEM = 'SYSTEM',
  ORG = 'ORG',
  WORKSPACE = 'WORKSPACE',
  PROJECT = 'PROJECT',
  TEMPLATE = 'TEMPLATE',
}

export enum GovernanceEntityType {
  TASK = 'TASK',
  PROJECT = 'PROJECT',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
  PHASE_GATE = 'PHASE_GATE',
}

export enum EnforcementMode {
  OFF = 'OFF',
  WARN = 'WARN',
  BLOCK = 'BLOCK',
  ADMIN_OVERRIDE = 'ADMIN_OVERRIDE',
}

@Entity({ name: 'governance_rule_sets' })
export class GovernanceRuleSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string | null;

  @Column({ name: 'scope_type', type: 'text', default: ScopeType.SYSTEM })
  scopeType: ScopeType;

  @Column({ name: 'scope_id', type: 'uuid', nullable: true })
  scopeId: string | null;

  @Column({ name: 'entity_type', type: 'text' })
  entityType: GovernanceEntityType;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'enforcement_mode',
    type: 'text',
    default: EnforcementMode.OFF,
  })
  enforcementMode: EnforcementMode;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('GovernanceRule', 'ruleSet')
  rules: any[];
}
