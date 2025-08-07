import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('pm_knowledge_chunks')
@Index(['domain', 'subdomain'])
@Index(['methodology', 'processGroup'])
export class PMKnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  domain: 'people' | 'process' | 'business_environment';

  @Column({ type: 'varchar', length: 100, nullable: true })
  subdomain: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  methodology: 'predictive' | 'agile' | 'hybrid' | 'universal';

  @Column({ type: 'varchar', length: 50, nullable: true })
  processGroup: 'initiating' | 'planning' | 'executing' | 'monitoring_controlling' | 'closing';

  @Column({ type: 'vector', length: 1536, nullable: true })
  embedding: number[];

  @Column({ type: 'varchar', length: 200, default: 'Rita_Mulcahy_PMP_11th_Ed' })
  source: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  confidence: number;

  @Column({ type: 'text', array: true, default: [] })
  applicability: string[];

  @CreateDateColumn()
  createdAt: Date;
}
