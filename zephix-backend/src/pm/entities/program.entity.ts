import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from "../../modules/users/entities/user.entity"
import { Organization } from '../../organizations/entities/organization.entity';
import { UserProject } from './user-project.entity';

@Entity('programs')
@Index(['userId'])
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'initiating' })
  status:
    | 'initiating'
    | 'planning'
    | 'executing'
    | 'monitoring_controlling'
    | 'closing';

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalBudget: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  benefits: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  dependencies: Record<string, any>;

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

  @OneToMany(() => UserProject, (project) => project.programId)
  projects: UserProject[];
}
