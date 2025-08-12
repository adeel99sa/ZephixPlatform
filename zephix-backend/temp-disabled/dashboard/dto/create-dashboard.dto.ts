import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
  IsUrl,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { DashboardType, DashboardStatus, DashboardLayout } from '../entities/dashboard.entity';

export class CreateDashboardDto {
  @ApiProperty({
    description: 'Dashboard name',
    example: 'Project Overview Dashboard',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Dashboard description',
    example: 'Comprehensive overview of all active projects and their status',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated if not provided)',
    example: 'project-overview-dashboard',
    pattern: '^[a-z0-9-]+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiProperty({
    description: 'Dashboard type',
    enum: DashboardType,
    example: DashboardType.TEAM,
  })
  @IsEnum(DashboardType)
  type: DashboardType;

  @ApiPropertyOptional({
    description: 'Dashboard status',
    enum: DashboardStatus,
    default: DashboardStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(DashboardStatus)
  status?: DashboardStatus;

  @ApiPropertyOptional({
    description: 'Dashboard layout type',
    enum: DashboardLayout,
    default: DashboardLayout.GRID,
  })
  @IsOptional()
  @IsEnum(DashboardLayout)
  layout?: DashboardLayout;

  @ApiPropertyOptional({
    description: 'Dashboard configuration as JSON',
    example: {
      columns: 12,
      rowHeight: 30,
      margin: [10, 10],
      containerPadding: [10, 10],
    },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dashboard metadata',
    example: {
      category: 'project-management',
      priority: 'high',
      department: 'engineering',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dashboard tags for categorization',
    example: ['projects', 'overview', 'team'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the dashboard is featured',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the dashboard is public within organization',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Dashboard thumbnail URL',
    example: 'https://example.com/thumbnails/dashboard.png',
  })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Dashboard color theme',
    example: 'dark',
    default: 'default',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  theme?: string;

  @ApiPropertyOptional({
    description: 'Dashboard refresh interval in seconds',
    example: 300,
    default: 300,
    minimum: 0,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3600)
  refreshInterval?: number;

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  organizationId: string;
}
