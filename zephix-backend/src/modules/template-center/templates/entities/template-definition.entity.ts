import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { TemplateVersion } from './template-version.entity';

@Entity('template_definitions')
@Index(['scope', 'orgId', 'workspaceId'])
export class TemplateDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'scope' })
  scope: string; // system | org | workspace

  @Column({ type: 'uuid', name: 'org_id', nullable: true })
  orgId: string | null;

  @Column({ type: 'uuid', name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'text', name: 'template_key' })
  templateKey: string;

  @Column({ type: 'text', name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @Column({ type: 'text', name: 'category', nullable: true })
  category: string | null;

  @Column({ type: 'boolean', name: 'is_prebuilt', default: false })
  isPrebuilt: boolean;

  @Column({ type: 'boolean', name: 'is_admin_default', default: false })
  isAdminDefault: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TemplateVersion, (v) => v.templateDefinition)
  versions?: TemplateVersion[];
}
