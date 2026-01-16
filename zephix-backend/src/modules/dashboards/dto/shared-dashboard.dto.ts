import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardVisibility } from '../entities/dashboard.entity';
import { WidgetKey, WIDGET_ALLOWLIST } from '../widgets/widget-allowlist';

class SharedDashboardLayoutDto {
  @ApiProperty({ description: 'X position', minimum: 0 })
  x: number;

  @ApiProperty({ description: 'Y position', minimum: 0 })
  y: number;

  @ApiProperty({ description: 'Width', minimum: 1, maximum: 12 })
  w: number;

  @ApiProperty({ description: 'Height', minimum: 1, maximum: 20 })
  h: number;
}

export class SharedDashboardWidgetDto {
  @ApiProperty({ description: 'Widget ID' })
  id: string;

  @ApiProperty({ description: 'Widget type', enum: WIDGET_ALLOWLIST })
  type: WidgetKey;

  @ApiProperty({ description: 'Widget title', maxLength: 200 })
  title: string;

  @ApiProperty({ description: 'Widget layout', type: SharedDashboardLayoutDto })
  layout: SharedDashboardLayoutDto;

  @ApiProperty({ description: 'Widget config (sanitized)' })
  config: Record<string, any>;
}

export class SharedDashboardDto {
  @ApiProperty({ description: 'Dashboard ID' })
  id: string;

  @ApiProperty({ description: 'Dashboard name', maxLength: 200 })
  name: string;

  @ApiPropertyOptional({ description: 'Dashboard description' })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Dashboard visibility',
    enum: DashboardVisibility,
  })
  visibility?: DashboardVisibility;

  @ApiProperty({
    description: 'Widgets for rendering',
    type: [SharedDashboardWidgetDto],
  })
  widgets: SharedDashboardWidgetDto[];
}
