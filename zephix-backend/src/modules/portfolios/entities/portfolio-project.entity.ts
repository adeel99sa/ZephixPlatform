import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Portfolio } from './portfolio.entity';
import { Project } from '../../projects/entities/project.entity';

/**
 * Phase 4.1: PortfolioProject Join Entity
 *
 * Data Model Decisions (locked in code comments):
 * - Join table: organizationId, portfolioId, projectId
 * - Unique constraint on (portfolioId, projectId) - one project can only be in a portfolio once
 * - Projects can belong to multiple portfolios (flexible for future expansion)
 * - Portfolio membership is org-level, but projects are workspace-scoped
 */
@Entity('portfolio_projects')
@Unique(['portfolioId', 'projectId'])
@Index('idx_portfolio_project_org', ['organizationId'])
@Index('idx_portfolio_project_org_portfolio', ['organizationId', 'portfolioId'])
@Index('idx_portfolio_project_org_project', ['organizationId', 'projectId'])
export class PortfolioProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'portfolio_id', type: 'uuid' })
  portfolioId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.portfolioProjects)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
