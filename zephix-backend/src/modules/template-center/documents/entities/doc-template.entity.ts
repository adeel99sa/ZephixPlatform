import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('doc_templates')
@Index(['docKey'], { unique: true })
export class DocTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'doc_key' })
  docKey: string;

  @Column({ type: 'text', name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'category' })
  category: string; // initiation, planning, execution, monitoring, change, closure

  @Column({ type: 'text', name: 'content_type' })
  contentType: string; // rich_text, file, link, form

  @Column({ type: 'jsonb', name: 'default_content', nullable: true })
  defaultContent: Record<string, any> | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
