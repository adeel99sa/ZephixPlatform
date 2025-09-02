import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../modules/projects/entities/project.entity';

@Entity('stakeholder_communications')
@Index(['projectId', 'stakeholderType'])
@Index(['communicationDate'])
export class StakeholderCommunication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('varchar', { length: 50 })
  stakeholderType: string; // 'executive', 'sponsor', 'team', 'client'

  @Column('varchar', { length: 255 })
  stakeholderName: string;

  @Column('date')
  communicationDate: Date;

  @Column('varchar', { length: 100 })
  communicationType: string; // 'status_report', 'meeting', 'email', 'presentation'

  @Column('varchar', { length: 255 })
  subject: string;

  @Column('text')
  content: string;

  @Column('jsonb', { nullable: true })
  deliveryMetrics: {
    opened?: boolean;
    openedAt?: string;
    responded?: boolean;
    respondedAt?: string;
    satisfactionRating?: number;
    feedbackReceived?: string;
  };

  @Column('text', { array: true, nullable: true })
  attachments: string[];

  @Column('varchar', { length: 20 })
  status: string; // 'sent', 'delivered', 'read', 'responded'

  @Column('uuid')
  sentBy: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
