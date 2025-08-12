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
import { IsUUID, IsString, IsOptional, IsBoolean, IsEnum, IsObject, IsNumber, IsArray } from 'class-validator';
import { Dashboard } from './dashboard.entity';

export enum WidgetType {
  // Project Widgets
  PROJECT_GRID = 'project_grid',
  PROJECT_TIMELINE = 'project_timeline',
  PROJECT_CARDS = 'project_cards',
  PROJECT_LIST = 'project_list',
  PROJECT_KANBAN = 'project_kanban',
  
  // Analytics Widgets
  KPI_METRIC = 'kpi_metric',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  AREA_CHART = 'area_chart',
  TABLE = 'table',
  HEATMAP = 'heatmap',
  SCATTER_PLOT = 'scatter_plot',
  
  // AI Widgets
  AI_INSIGHTS = 'ai_insights',
  AI_PREDICTIONS = 'ai_predictions',
  AI_ALERTS = 'ai_alerts',
  AI_RECOMMENDATIONS = 'ai_recommendations',
  
  // Action Widgets
  ALERTS = 'alerts',
  APPROVALS = 'approvals',
  TASKS = 'tasks',
  NOTIFICATIONS = 'notifications',
  
  // Custom Widgets
  CUSTOM_HTML = 'custom_html',
  EMBEDDED_CONTENT = 'embedded_content',
  IFRAME = 'iframe',
}

export enum WidgetSize {
  SMALL = 'small',    // 1x1 grid units
  MEDIUM = 'medium',  // 2x2 grid units
  LARGE = 'large',    // 3x3 grid units
  XLARGE = 'xlarge',  // 4x4 grid units
  FULL_WIDTH = 'full_width', // Full width, variable height
  CUSTOM = 'custom',  // Custom dimensions
}

export enum WidgetStatus {
  ACTIVE = 'active',
  LOADING = 'loading',
  ERROR = 'error',
  DISABLED = 'disabled',
}

@Entity('dashboard_widgets')
@Index(['dashboardId', 'order'])
@Index(['widgetType', 'status'])
export class DashboardWidget {
  @ApiProperty({ description: 'Unique identifier for the widget' })
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Widget title' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Widget description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Widget type' })
  @Column({
    type: 'enum',
    enum: WidgetType,
  })
  @IsEnum(WidgetType)
  widgetType: WidgetType;

  @ApiProperty({ description: 'Widget size' })
  @Column({
    type: 'enum',
    enum: WidgetSize,
    default: WidgetSize.MEDIUM,
  })
  @IsEnum(WidgetSize)
  size: WidgetSize;

  @ApiProperty({ description: 'Widget status' })
  @Column({
    type: 'enum',
    enum: WidgetStatus,
    default: WidgetStatus.ACTIVE,
  })
  @IsEnum(WidgetStatus)
  status: WidgetStatus;

  @ApiProperty({ description: 'Widget configuration as JSON' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiProperty({ description: 'Widget data source configuration' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  dataSource?: Record<string, any>;

  @ApiProperty({ description: 'Widget styling configuration' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  styling?: Record<string, any>;

  @ApiProperty({ description: 'Widget position and layout' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  layout?: {
    x: number;
    y: number;
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };

  @ApiProperty({ description: 'Widget order in dashboard' })
  @Column({ type: 'integer', default: 0 })
  @IsNumber()
  order: number;

  @ApiProperty({ description: 'Whether widget is collapsible' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isCollapsible: boolean;

  @ApiProperty({ description: 'Whether widget is collapsed by default' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isCollapsed: boolean;

  @ApiProperty({ description: 'Whether widget is resizable' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isResizable: boolean;

  @ApiProperty({ description: 'Whether widget is draggable' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isDraggable: boolean;

  @ApiProperty({ description: 'Widget refresh interval in seconds' })
  @Column({ type: 'integer', default: 0 })
  @IsNumber()
  refreshInterval: number;

  @ApiProperty({ description: 'Last data refresh timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  lastRefreshedAt?: Date;

  @ApiProperty({ description: 'Widget filters' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiProperty({ description: 'Widget permissions' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>;

  @ApiProperty({ description: 'Widget metadata' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Widget tags' })
  @Column({ type: 'text', array: true, default: [] })
  @IsArray()
  tags: string[];

  @ApiProperty({ description: 'Dashboard ID' })
  @Column({ type: 'uuid' })
  @IsUUID()
  dashboardId: string;

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
  @ManyToOne(() => Dashboard, (dashboard) => dashboard.widgets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dashboardId' })
  dashboard: Dashboard;
}
