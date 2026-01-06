import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Template } from './template.entity';
import { LegoBlock } from './lego-block.entity';

@Entity('template_blocks')
@Index('idx_template_blocks_org_template', ['organizationId', 'templateId'])
@Index('idx_template_blocks_org_block', ['organizationId', 'blockId'])
@Index(
  'uq_template_blocks_org_template_block',
  ['organizationId', 'templateId', 'blockId'],
  {
    unique: true,
  },
)
export class TemplateBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @Column({ name: 'block_id' })
  blockId: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ type: 'jsonb', default: {} })
  config: {
    thresholds?: any;
    fieldMappings?: any;
    visibilityRules?: any;
    layoutHints?: any;
  };

  @Column({ default: false })
  locked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @ManyToOne(() => LegoBlock)
  @JoinColumn({ name: 'block_id' })
  block: LegoBlock;
}

