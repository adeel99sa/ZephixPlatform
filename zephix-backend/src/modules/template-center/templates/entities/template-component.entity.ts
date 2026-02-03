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

@Entity('template_components')
@Index(['templateVersionId', 'componentType', 'componentKey'], { unique: true })
export class TemplateComponent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'template_version_id' })
  templateVersionId: string;

  @Column({ type: 'text', name: 'component_type' })
  componentType: string; // phase | gate | task | kpi | doc

  @Column({ type: 'text', name: 'component_key' })
  componentKey: string;

  @Column({ type: 'text', name: 'name' })
  name: string;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', name: 'data' })
  data: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => TemplateVersion, (v) => v.components, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_version_id' })
  templateVersion?: TemplateVersion;
}
