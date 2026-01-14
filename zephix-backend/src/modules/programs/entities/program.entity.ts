import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';

/**
 * PHASE 6: Program Entity - Workspace-Scoped
 *
 * Data Model Decisions:
 * - Program belongs to organizationId, workspaceId, and portfolioId
 * - Optional name, description, status
 * - CreatedBy (createdById), timestamps
 * - Unique constraint: (portfolioId, name) for uniqueness within portfolio (case-insensitive)
 * - Status enum: ACTIVE, ARCHIVED
 * - Program must belong to same workspace as its portfolio
 */
export enum ProgramStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('programs')
@Index('idx_program_org_workspace', ['organizationId', 'workspaceId'])
@Index('idx_program_org_workspace_portfolio', [
  'organizationId',
  'workspaceId',
  'portfolioId',
])
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index('idx_program_org')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'portfolio_id', type: 'uuid' })
  portfolioId: string;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.programs)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ProgramStatus.ACTIVE,
  })
  status: ProgramStatus;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => Project, (project) => project.program)
  projects: Project[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
