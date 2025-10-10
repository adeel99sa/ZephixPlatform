import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

@Entity('organization_workspace_config')
@Unique(['organizationId'])
export class OrganizationWorkspaceConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'max_depth', type: 'int', default: 2 })
  maxDepth: number;

  @Column({ name: 'level_0_label', type: 'varchar', length: 50, default: 'Workspace' })
  level0Label: string;

  @Column({ name: 'level_1_label', type: 'varchar', length: 50, default: 'Sub-workspace' })
  level1Label: string;

  @Column({ name: 'level_2_label', type: 'varchar', length: 50, default: 'Project' })
  level2Label: string;

  @Column({ name: 'allow_projects_at_all_levels', type: 'boolean', default: false })
  allowProjectsAtAllLevels: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Helper methods
  getLabelForLevel(level: number): string {
    switch (level) {
      case 0:
        return this.level0Label;
      case 1:
        return this.level1Label;
      case 2:
        return this.level2Label;
      default:
        return `Level ${level}`;
    }
  }

  canCreateAtLevel(level: number): boolean {
    return level <= this.maxDepth;
  }

  canCreateProjectsAtLevel(level: number): boolean {
    return this.allowProjectsAtAllLevels || level === this.maxDepth;
  }
}
