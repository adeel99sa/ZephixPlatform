import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('gate_approvals')
@Index(['projectId', 'gateKey', 'decidedAt'])
export class GateApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'text', name: 'gate_key' })
  gateKey: string;

  @Column({ type: 'text', name: 'decision' })
  decision: string; // approved | approved_with_comments | rejected

  @Column({ type: 'text', name: 'comment', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', name: 'evidence', nullable: true })
  evidence: Record<string, any> | null;

  @Column({ type: 'uuid', name: 'decided_by' })
  decidedBy: string;

  @Column({ type: 'timestamptz', name: 'decided_at', default: () => 'now()' })
  decidedAt: Date;
}
