import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Organization } from '../../../core/modules/organizations/entities/organization.entity';
import { KpiDefinition } from './kpi-definition.entity';

@Entity('organization_mandatory_kpis')
@Unique(['organization_id', 'kpi_id'])
export class OrganizationMandatoryKpi {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  kpi_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => KpiDefinition, kpi => kpi.organizationKpis, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kpi_id' })
  kpi: KpiDefinition;
}
