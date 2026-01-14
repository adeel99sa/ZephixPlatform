import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum DashboardPersona {
  EXEC = 'EXEC',
  PMO = 'PMO',
  PROGRAM_MANAGER = 'PROGRAM_MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  RESOURCE_MANAGER = 'RESOURCE_MANAGER',
  DELIVERY_LEAD = 'DELIVERY_LEAD',
}

export enum DashboardMethodology {
  AGILE = 'AGILE',
  SCRUM = 'SCRUM',
  WATERFALL = 'WATERFALL',
  HYBRID = 'HYBRID',
}

@Entity('dashboard_templates')
@Unique(['organizationId', 'key'])
export class DashboardTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'varchar', length: 120 })
  key: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({
    type: 'enum',
    enum: DashboardPersona,
  })
  persona: DashboardPersona;

  @Column({
    type: 'enum',
    enum: DashboardMethodology,
    nullable: true,
  })
  methodology: DashboardMethodology | null;

  @Column({ type: 'jsonb' })
  definition: {
    visibility: string;
    widgets: Array<{
      widgetKey: string;
      title: string;
      config: Record<string, any>;
      layout: {
        x: number;
        y: number;
        w: number;
        h: number;
      };
    }>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
