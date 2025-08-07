import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProjectTask } from './project-task.entity';
import { ProjectRisk } from './project-risk.entity';
import { ProjectStakeholder } from './project-stakeholder.entity';

@Entity('user_projects')
@Index(['userId', 'status'])
@Index(['portfolioId'])
export class UserProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  methodology: 'predictive' | 'agile' | 'hybrid' | 'universal';

  @Column({ type: 'varchar', length: 50, default: 'planning' })
  status: 'initiating' | 'planning' | 'executing' | 'monitoring_controlling' | 'closing' | 'on_hold' | 'cancelled';

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  targetEndDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budget: number;

  @Column({ type: 'uuid', nullable: true })
  portfolioId: string;

  @Column({ type: 'uuid', nullable: true })
  programId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ProjectTask, task => task.project)
  tasks: ProjectTask[];

  @OneToMany(() => ProjectRisk, risk => risk.project)
  risks: ProjectRisk[];

  @OneToMany(() => ProjectStakeholder, stakeholder => stakeholder.project)
  stakeholders: ProjectStakeholder[];
}
