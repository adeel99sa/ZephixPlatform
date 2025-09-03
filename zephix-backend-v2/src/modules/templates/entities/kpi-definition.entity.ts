import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrganizationMandatoryKpi } from './organization-mandatory-kpi.entity';

@Entity('kpi_definitions')
export class KpiDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'text', nullable: true })
  formula: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit: string;

  @Column({ type: 'boolean', default: true })
  is_system_kpi: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relationships
  @OneToMany(() => OrganizationMandatoryKpi, orgKpi => orgKpi.kpi)
  organizationKpis: OrganizationMandatoryKpi[];
}
