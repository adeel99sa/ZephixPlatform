import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TemplateDefinition } from '../../templates/entities/template-definition.entity';
import { TemplateVersion } from '../../templates/entities/template-version.entity';

@Entity('template_lineage')
@Index(['projectId'], { unique: true })
export class TemplateLineage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'template_definition_id' })
  templateDefinitionId: string;

  @Column({ type: 'uuid', name: 'template_version_id' })
  templateVersionId: string;

  @Column({ type: 'timestamptz', name: 'applied_at', default: () => 'now()' })
  appliedAt: Date;

  @Column({ type: 'uuid', name: 'applied_by' })
  appliedBy: string;

  @Column({ type: 'text', name: 'upgrade_state', default: 'none' })
  upgradeState: string; // none | eligible | pending | applied | blocked

  @Column({ type: 'text', name: 'upgrade_notes', nullable: true })
  upgradeNotes: string | null;

  @ManyToOne(() => TemplateDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_definition_id' })
  templateDefinition?: TemplateDefinition;

  @ManyToOne(() => TemplateVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_version_id' })
  templateVersion?: TemplateVersion;
}
