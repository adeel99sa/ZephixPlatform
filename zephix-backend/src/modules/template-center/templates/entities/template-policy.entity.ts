import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TemplateVersion } from './template-version.entity';

@Entity('template_policies')
@Index(['templateVersionId'])
export class TemplatePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'template_version_id' })
  templateVersionId: string;

  @Column({ type: 'text', name: 'policy_key' })
  policyKey: string;

  @Column({ type: 'text', name: 'policy_type' })
  policyType: string; // required_kpi | required_document | gate_rule

  @Column({ type: 'jsonb', name: 'policy' })
  policy: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => TemplateVersion, (v) => v.policies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_version_id' })
  templateVersion?: TemplateVersion;
}
