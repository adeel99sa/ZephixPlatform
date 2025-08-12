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
  Min,
  Max,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WidgetType, WidgetSize } from '../entities/dashboard-widget.entity';

export class WidgetLayoutDto {
  @ApiProperty({
    description: 'X position in grid',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  x: number;

  @ApiProperty({
    description: 'Y position in grid',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  y: number;

  @ApiProperty({
    description: 'Width in grid units',
    example: 6,
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  width: number;

  @ApiProperty({
    description: 'Height in grid units',
    example: 4,
    minimum: 1,
    maximum: 20,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  height: number;

  @ApiPropertyOptional({
    description: 'Minimum width in grid units',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minWidth?: number;

  @ApiPropertyOptional({
    description: 'Minimum height in grid units',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minHeight?: number;

  @ApiPropertyOptional({
    description: 'Maximum width in grid units',
    example: 12,
    maximum: 12,
  })
  @IsOptional()
  @IsInt()
  @Max(12)
  maxWidth?: number;

  @ApiPropertyOptional({
    description: 'Maximum height in grid units',
    example: 10,
    maximum: 20,
  })
  @IsOptional()
  @IsInt()
  @Max(20)
  maxHeight?: number;
}

export class CreateWidgetDto {
  @ApiProperty({
    description: 'Widget title',
    example: 'Project Status Overview',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Widget description',
    example: 'Shows current status of all active projects',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Widget type',
    enum: WidgetType,
    example: WidgetType.PROJECT_GRID,
  })
  @IsEnum(WidgetType)
  widgetType: WidgetType;

  @ApiPropertyOptional({
    description: 'Widget size',
    enum: WidgetSize,
    default: WidgetSize.MEDIUM,
  })
  @IsOptional()
  @IsEnum(WidgetSize)
  size?: WidgetSize;

  @ApiPropertyOptional({
    description: 'Widget configuration as JSON',
    example: {
      showFilters: true,
      maxItems: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Widget data source configuration',
    example: {
      entity: 'Project',
      filters: { status: 'active' },
      aggregation: 'count',
    },
  })
  @IsOptional()
  @IsObject()
  dataSource?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Widget styling configuration',
    example: {
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderRadius: '8px',
      shadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  })
  @IsOptional()
  @IsObject()
  styling?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Widget position and layout',
    type: WidgetLayoutDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WidgetLayoutDto)
  layout?: WidgetLayoutDto;

  @ApiPropertyOptional({
    description: 'Widget order in dashboard',
    example: 1,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether widget is collapsible',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isCollapsible?: boolean;

  @ApiPropertyOptional({
    description: 'Whether widget is collapsed by default',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isCollapsed?: boolean;

  @ApiPropertyOptional({
    description: 'Whether widget is resizable',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isResizable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether widget is draggable',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isDraggable?: boolean;

  @ApiPropertyOptional({
    description: 'Widget refresh interval in seconds',
    example: 60,
    default: 0,
    minimum: 0,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3600)
  refreshInterval?: number;

  @ApiPropertyOptional({
    description: 'Widget filters',
    example: {
      status: ['active', 'pending'],
      priority: 'high',
      department: 'engineering',
    },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Widget permissions',
    example: {
      canEdit: true,
      canDelete: false,
      canShare: true,
    },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Widget metadata',
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
    description: 'Widget tags',
    example: ['projects', 'status', 'overview'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Dashboard ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  dashboardId: string;
}
