import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_token_usage')
@Index(['organizationId', 'month'])
@Index(['userId', 'month'])
export class AITokenUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 7 }) // Format: 2025-01
  month: string;

  @Column({ name: 'tokens_used', type: 'integer', default: 0 })
  tokensUsed: number;

  @Column({ name: 'tokens_limit', type: 'integer' })
  tokensLimit: number;

  @Column({ name: 'tokens_purchased', type: 'integer', default: 0 })
  tokensPurchased: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
