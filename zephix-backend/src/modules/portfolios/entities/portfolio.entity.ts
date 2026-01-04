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
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Program } from '../../programs/entities/program.entity';
import { PortfolioProject } from './portfolio-project.entity';

/**
 * Phase 4.1: Portfolio Entity
 *
 * Data Model Decisions (locked in code comments):
 * - Portfolio belongs to organizationId (org-level, not workspace-scoped)
 * - Optional name, description, status
 * - CreatedBy (createdById), timestamps
 * - Unique constraint: (organizationId, name) for uniqueness within org
 * - Status enum: ACTIVE, ARCHIVED
 */
export enum PortfolioStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('portfolios')
@Index('idx_portfolio_org_name', ['organizationId', 'name'], { unique: true })
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index('idx_portfolio_org')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: PortfolioStatus.ACTIVE,
  })
  status: PortfolioStatus;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => Program, (program) => program.portfolio)
  programs: Program[];

  @OneToMany(() => PortfolioProject, (pp) => pp.portfolio)
  portfolioProjects: PortfolioProject[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
