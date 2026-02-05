import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { TemplateDefinition } from './template-definition.entity';
import { TemplatePolicy } from './template-policy.entity';
import { TemplateComponent } from './template-component.entity';

@Entity('template_versions')
@Index(['templateDefinitionId', 'version'], { unique: true })
@Index(['templateDefinitionId', 'status'])
export class TemplateVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'template_definition_id' })
  templateDefinitionId: string;

  @Column({ type: 'int', name: 'version' })
  version: number;

  @Column({ type: 'text', name: 'status' })
  status: string; // draft | published | deprecated

  @Column({ type: 'text', name: 'changelog', nullable: true })
  changelog: string | null;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'uuid', name: 'published_by', nullable: true })
  publishedBy: string | null;

  @Column({ type: 'jsonb', name: 'schema' })
  schema: Record<string, any>;

  @Column({ type: 'text', name: 'hash' })
  hash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => TemplateDefinition, (d) => d.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_definition_id' })
  templateDefinition?: TemplateDefinition;

  @OneToMany(() => TemplatePolicy, (p) => p.templateVersion)
  policies?: TemplatePolicy[];

  @OneToMany(() => TemplateComponent, (c) => c.templateVersion)
  components?: TemplateComponent[];
}
