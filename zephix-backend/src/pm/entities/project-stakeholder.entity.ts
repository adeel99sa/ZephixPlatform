import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserProject } from './user-project.entity';

@Entity('project_stakeholders')
@Index(['projectId', 'influence', 'interest'])
export class ProjectStakeholder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  projectId: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  role: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  organization: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  influence: 'high' | 'medium' | 'low';

  @Column({ type: 'varchar', length: 20, nullable: true })
  interest: 'high' | 'medium' | 'low';

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  communicationPreference: string;

  @Column({ type: 'text', nullable: true })
  engagementStrategy: string;

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
