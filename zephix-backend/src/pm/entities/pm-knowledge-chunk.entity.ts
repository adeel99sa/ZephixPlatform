import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('pm_knowledge_chunks')
@Index(['domain', 'subdomain'])
@Index(['methodology', 'processGroup'])
export class PMKnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  domain: 'people' | 'process' | 'business_environment';

  @Column({ type: 'varchar', length: 100, nullable: true })
  subdomain: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  methodology: 'predictive' | 'agile' | 'hybrid' | 'universal';

  @Column({ type: 'varchar', length: 50, nullable: true })
  processGroup:
    | 'initiating'
    | 'planning'
    | 'executing'
    | 'monitoring_controlling'
    | 'closing';

  @Column({ type: 'text', nullable: true })
  embedding: string; // Store as JSON string for now, will be converted to vector after pgvector is installed

  @Column({ type: 'varchar', length: 200, default: 'Rita_Mulcahy_PMP_11th_Ed' })
  source: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  confidence: number;

  @Column({ type: 'text', array: true, default: [] })
  applicability: string[];

  @CreateDateColumn()
  createdAt: Date;
}
