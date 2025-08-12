import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsBoolean, IsEnum, IsObject, IsArray } from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { DashboardWidget } from './dashboard-widget.entity';
import { DashboardPermission } from './dashboard-permission.entity';

export enum DashboardType {
  PERSONAL = 'personal',
  TEAM = 'team',
  ORGANIZATION = 'organization',
  TEMPLATE = 'template',
}

export enum DashboardStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export enum DashboardLayout {
  GRID = 'grid',
  FLEXIBLE = 'flexible',
  CUSTOM = 'custom',
}

@Entity('dashboards')
@Index(['organizationId', 'status'])
@Index(['createdById', 'type'])
@Index(['slug', 'organizationId'], { unique: true })
export class Dashboard {
  @ApiProperty({ description: 'Unique identifier for the dashboard' })
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Dashboard name' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Dashboard description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'URL-friendly slug for the dashboard' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Dashboard type' })
  @Column({
    type: 'enum',
    enum: DashboardType,
    default: DashboardType.PERSONAL,
  })
  @IsEnum(DashboardType)
  type: DashboardType;

  @ApiProperty({ description: 'Dashboard status' })
  @Column({
    type: 'enum',
    enum: DashboardStatus,
    default: DashboardStatus.DRAFT,
  })
  @IsEnum(DashboardStatus)
  status: DashboardStatus;

  @ApiProperty({ description: 'Dashboard layout type' })
  @Column({
    type: 'enum',
    enum: DashboardLayout,
    default: DashboardLayout.GRID,
  })
  @IsEnum(DashboardLayout)
  layout: DashboardLayout;

  @ApiProperty({ description: 'Dashboard configuration as JSON' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiProperty({ description: 'Dashboard metadata' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Dashboard tags for categorization' })
  @Column({ type: 'text', array: true, default: [] })
  @IsArray()
  tags: string[];

  @ApiProperty({ description: 'Whether the dashboard is featured' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isFeatured: boolean;

  @ApiProperty({ description: 'Whether the dashboard is public within organization' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ description: 'Dashboard thumbnail URL' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Dashboard color theme' })
  @Column({ type: 'varchar', length: 50, default: 'default' })
  @IsString()
  theme: string;

  @ApiProperty({ description: 'Dashboard refresh interval in seconds' })
  @Column({ type: 'integer', default: 300 })
  refreshInterval: number;

  @ApiProperty({ description: 'Last refresh timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  lastRefreshedAt?: Date;

  @ApiProperty({ description: 'View count for analytics' })
  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'Created by user ID' })
  @Column({ type: 'uuid' })
  @IsUUID()
  createdById: string;

  @ApiProperty({ description: 'Last modified by user ID' })
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  lastModifiedById?: string;

  @ApiProperty({ description: 'Created timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'Soft delete timestamp' })
  @DeleteDateColumn()
  deletedAt?: Date;

  // Relationships
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lastModifiedById' })
  lastModifiedBy: User;

  @OneToMany(() => DashboardWidget, (widget) => widget.dashboard, {
    cascade: true,
    eager: false,
  })
  widgets: DashboardWidget[];

  @OneToMany(() => DashboardPermission, (permission) => permission.dashboard, {
    cascade: true,
    eager: false,
  })
  permissions: DashboardPermission[];
}
