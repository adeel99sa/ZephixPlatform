import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserProject } from './user-project.entity';

@Entity('project_risks')
@Index(['projectId', 'riskScore'])
export class ProjectRisk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  projectId: string;

  @Column({ type: 'text', nullable: false })
  riskDescription: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  probability: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

  @Column({ type: 'varchar', length: 20, nullable: true })
  impact: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  riskScore: number;

  @Column({ type: 'text', nullable: true })
  mitigationStrategy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  owner: string;

  @Column({ type: 'varchar', length: 50, default: 'identified' })
  status: 'identified' | 'mitigated' | 'accepted' | 'transferred' | 'closed';

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => UserProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: UserProject;
}
