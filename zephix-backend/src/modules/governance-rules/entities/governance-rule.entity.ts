import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GovernanceRuleSet } from './governance-rule-set.entity';

export enum ConditionType {
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  ROLE_ALLOWED = 'ROLE_ALLOWED',
  USER_ALLOWED = 'USER_ALLOWED',
  FIELD_EQUALS = 'FIELD_EQUALS',
  FIELD_NOT_EMPTY = 'FIELD_NOT_EMPTY',
  NUMBER_GTE = 'NUMBER_GTE',
  NUMBER_LTE = 'NUMBER_LTE',
  EXISTS_RELATED = 'EXISTS_RELATED',
  APPROVALS_MET = 'APPROVALS_MET',
}

export enum ConditionSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export interface RuleCondition {
  type: ConditionType;
  field?: string;
  value?: string | number;
  relatedEntity?: string;
  params?: Record<string, any>;
}

export interface RuleDefinition {
  when?: {
    fromStatus?: string;
    toStatus?: string;
  };
  conditions: RuleCondition[];
  message: string;
  severity: ConditionSeverity;
}

@Entity({ name: 'governance_rules' })
export class GovernanceRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rule_set_id', type: 'uuid' })
  ruleSetId: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'rule_definition', type: 'jsonb', default: '{}' })
  ruleDefinition: RuleDefinition;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => GovernanceRuleSet, (rs) => rs.rules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rule_set_id' })
  ruleSet: GovernanceRuleSet;
}
