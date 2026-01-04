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

/**
 * Phase 4.1: Program Entity
 *
 * Data Model Decisions (locked in code comments):
 * - Program belongs to organizationId and portfolioId
 * - Optional name, description, status
 * - CreatedBy (createdById), timestamps
 * - Unique constraint: (organizationId, portfolioId, name) for uniqueness within portfolio
 * - Status enum: ACTIVE, ARCHIVED
 * - Projects reach portfolio through program (program.portfolioId -> portfolio.id)
 */
export enum ProgramStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('programs')
@Index('idx_program_org_portfolio', ['organizationId', 'portfolioId'])
@Index('idx_program_org_portfolio_name', ['organizationId', 'portfolioId', 'name'], {
  unique: true,
})
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index('idx_program_org')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

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
