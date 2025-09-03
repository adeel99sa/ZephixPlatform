import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ResourceAllocation } from './resource-allocation.entity';

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  role: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  @Column('text', { array: true, default: '{}' })
  skills: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 40 })
  capacity_hours_per_week: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost_per_hour: number;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => ResourceAllocation, allocation => allocation.resource)
  allocations: ResourceAllocation[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
