import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GovernanceRuleSet } from './governance-rule-set.entity';
import { GovernanceRule } from './governance-rule.entity';

@Entity({ name: 'governance_rule_active_versions' })
export class GovernanceRuleActiveVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rule_set_id', type: 'uuid' })
  ruleSetId: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ name: 'active_rule_id', type: 'uuid' })
  activeRuleId: string;

  @ManyToOne(() => GovernanceRuleSet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_set_id' })
  ruleSet: GovernanceRuleSet;

  @ManyToOne(() => GovernanceRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'active_rule_id' })
  activeRule: GovernanceRule;
}
