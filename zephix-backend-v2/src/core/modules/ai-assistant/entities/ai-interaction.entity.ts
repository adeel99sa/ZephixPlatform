import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('ai_interactions')
@Index(['userId', 'organizationId'])
@Index(['createdAt'])
export class AIInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'text' })
  query: string;

  @Column({ type: 'text' })
  response: string;

  @Column({ name: 'tokens_used', type: 'integer' })
  tokensUsed: number;

  @Column({ name: 'model_used', default: 'gpt-4' })
  modelUsed: string;

  @Column({ name: 'response_time_ms', type: 'integer', nullable: true })
  responseTimeMs: number;

  @Column({ type: 'jsonb', nullable: true })
  context: any;

  @Column({ 
    type: 'varchar',
    length: 20,
    nullable: true 
  })
  feedback: string;  // Changed from union type to string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
