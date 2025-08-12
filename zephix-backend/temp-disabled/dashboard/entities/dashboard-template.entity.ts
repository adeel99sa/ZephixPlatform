import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsBoolean, IsEnum, IsObject, IsArray, IsNumber } from 'class-validator';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

export enum TemplateCategory {
  PROJECT_MANAGEMENT = 'project_management',
  BUSINESS_INTELLIGENCE = 'business_intelligence',
  OPERATIONS = 'operations',
  FINANCE = 'finance',
  HR = 'hr',
  MARKETING = 'marketing',
  SALES = 'sales',
  CUSTOMER_SUPPORT = 'customer_support',
  IT = 'it',
  GENERAL = 'general',
}

export enum TemplateType {
  BLANK = 'blank',
  PREBUILT = 'prebuilt',
  CUSTOM = 'custom',
  INDUSTRY_SPECIFIC = 'industry_specific',
}

@Entity('dashboard_templates')
@Index(['organizationId', 'category'])
@Index(['templateType', 'isPublic'])
@Index(['createdById', 'status'])
export class DashboardTemplate {
  @ApiProperty({ description: 'Unique identifier for the template' })
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Template name' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Template category' })
  @Column({
    type: 'enum',
    enum: TemplateCategory,
    default: TemplateCategory.GENERAL,
  })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ description: 'Template type' })
  @Column({
    type: 'enum',
    enum: TemplateType,
    default: TemplateType.PREBUILT,
  })
  @IsEnum(TemplateType)
  templateType: TemplateType;

  @ApiProperty({ description: 'Template configuration as JSON' })
  @Column({ type: 'jsonb' })
  @IsObject()
  config: {
    layout: string;
    widgets: Array<{
      type: string;
      title: string;
      size: string;
      position: { x: number; y: number; width: number; height: number };
      config: Record<string, any>;
    }>;
    theme: string;
    refreshInterval: number;
  };

  @ApiProperty({ description: 'Template metadata' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Template tags' })
  @Column({ type: 'text', array: true, default: [] })
  @IsArray()
  tags: string[];

  @ApiProperty({ description: 'Template thumbnail URL' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Template preview URL' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  previewUrl?: string;

  @ApiProperty({ description: 'Whether template is public' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ description: 'Whether template is featured' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isFeatured: boolean;

  @ApiProperty({ description: 'Template version' })
  @Column({ type: 'varchar', length: 50, default: '1.0.0' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Template usage count' })
  @Column({ type: 'integer', default: 0 })
  @IsNumber()
  usageCount: number;

  @ApiProperty({ description: 'Template rating' })
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  @IsNumber()
  rating: number;

  @ApiProperty({ description: 'Template review count' })
  @Column({ type: 'integer', default: 0 })
  @IsNumber()
  reviewCount: number;

  @ApiProperty({ description: 'Template status' })
  @Column({ type: 'varchar', length: 50, default: 'active' })
  @IsString()
  status: string;

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
}
