import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index, Check } from 'typeorm';
import { Template } from '../../templates/entities/template.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';
import { ResourceAllocation } from '../../resources/entities/resource-allocation.entity';

@Entity('projects')
@Index('idx_projects_org', ['organizationId'])
@Index('idx_projects_status', ['status'])
@Check(`status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')`)
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'templateId', type: 'uuid', nullable: true })
  templateId: string;

  @Column({ name: 'currentPhase', length: 100, nullable: true })
  currentPhase: string;

  @Column({ 
    length: 20,
    default: 'planning',
    type: 'varchar'
  })
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';

  @Column({ name: 'startDate', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'endDate', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'organizationId' })
  organizationId: string;

  @Column({ name: 'created_by' })
  created_by: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @ManyToOne(() => Template, template => template.projects)
  @JoinColumn({ name: 'templateId' })
  template: Template;

  @OneToMany(() => WorkItem, workItem => workItem.project)
  workItems: WorkItem[];

  @OneToMany(() => ResourceAllocation, allocation => allocation.project)
  allocations: ResourceAllocation[];

}
