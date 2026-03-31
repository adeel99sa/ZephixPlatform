import { BadRequestException } from '@nestjs/common';

const DASHBOARD_LAYOUT_VERSION = 1 as const;

const WIDGET_TYPES = new Set([
  'kpi_cards',
  'project_health_list',
  'risk_summary',
  'budget_summary',
  'resource_utilization',
  'recent_projects',
  'project_status_summary',
  'upcoming_milestones',
  'open_risks',
  'documents_summary',
]);

type PrimitiveValue = string | number | boolean | null;

export type DashboardWidgetType =
  | 'kpi_cards'
  | 'project_health_list'
  | 'risk_summary'
  | 'budget_summary'
  | 'resource_utilization'
  | 'recent_projects'
  | 'project_status_summary'
  | 'upcoming_milestones'
  | 'open_risks'
  | 'documents_summary';

export interface DashboardWidgetLayoutContract {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidgetDataSourceContract {
  kind: DashboardWidgetType;
  metricKey?: string;
  projectId?: string;
}

export interface DashboardWidgetContract {
  id: string;
  type: DashboardWidgetType;
  title: string;
  layout: DashboardWidgetLayoutContract;
  config: Record<string, PrimitiveValue>;
  dataSource?: DashboardWidgetDataSourceContract;
}

export interface DashboardLayoutContract {
  version: typeof DASHBOARD_LAYOUT_VERSION;
  grid: {
    columns: number;
    rowHeight: number;
  };
  widgets: DashboardWidgetContract[];
}

export function getDefaultDashboardLayoutConfig(): DashboardLayoutContract {
  return {
    version: DASHBOARD_LAYOUT_VERSION,
    grid: {
      columns: 12,
      rowHeight: 32,
    },
    widgets: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestException(`${path} must be a finite number`);
  }
  return value;
}

function asNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function validateLayout(layout: unknown, path: string): DashboardWidgetLayoutContract {
  if (!isRecord(layout)) {
    throw new BadRequestException(`${path} must be an object`);
  }

  const x = asFiniteNumber(layout.x, `${path}.x`);
  const y = asFiniteNumber(layout.y, `${path}.y`);
  const w = asFiniteNumber(layout.w, `${path}.w`);
  const h = asFiniteNumber(layout.h, `${path}.h`);

  if (x < 0 || y < 0) {
    throw new BadRequestException(`${path}.x and ${path}.y must be >= 0`);
  }
  if (w < 1 || w > 12) {
    throw new BadRequestException(`${path}.w must be between 1 and 12`);
  }
  if (h < 1 || h > 20) {
    throw new BadRequestException(`${path}.h must be between 1 and 20`);
  }

  return {
    x: Math.floor(x),
    y: Math.floor(y),
    w: Math.floor(w),
    h: Math.floor(h),
  };
}

function validateConfig(
  config: unknown,
  path: string,
): Record<string, PrimitiveValue> {
  if (!isRecord(config)) {
    throw new BadRequestException(`${path} must be an object`);
  }

  const sanitized: Record<string, PrimitiveValue> = {};
  for (const [key, value] of Object.entries(config)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      sanitized[key] = value as PrimitiveValue;
      continue;
    }
    throw new BadRequestException(
      `${path}.${key} must be string, number, boolean, or null`,
    );
  }

  return sanitized;
}

function validateDataSource(
  dataSource: unknown,
  path: string,
): DashboardWidgetDataSourceContract {
  if (!isRecord(dataSource)) {
    throw new BadRequestException(`${path} must be an object`);
  }

  const kind = asNonEmptyString(dataSource.kind, `${path}.kind`);
  if (!WIDGET_TYPES.has(kind)) {
    throw new BadRequestException(`${path}.kind is not supported`);
  }

  const metricKey =
    dataSource.metricKey === undefined
      ? undefined
      : asNonEmptyString(dataSource.metricKey, `${path}.metricKey`);
  const projectId =
    dataSource.projectId === undefined
      ? undefined
      : asNonEmptyString(dataSource.projectId, `${path}.projectId`);

  return {
    kind: kind as DashboardWidgetType,
    metricKey,
    projectId,
  };
}

function validateWidgets(widgets: unknown): DashboardWidgetContract[] {
  if (!Array.isArray(widgets)) {
    throw new BadRequestException('layoutConfig.widgets must be an array');
  }

  return widgets.map((widget, idx) => {
    const basePath = `layoutConfig.widgets[${idx}]`;
    if (!isRecord(widget)) {
      throw new BadRequestException(`${basePath} must be an object`);
    }

    const type = asNonEmptyString(widget.type, `${basePath}.type`);
    if (!WIDGET_TYPES.has(type)) {
      throw new BadRequestException(`${basePath}.type is not supported`);
    }

    return {
      id: asNonEmptyString(widget.id, `${basePath}.id`),
      type: type as DashboardWidgetType,
      title: asNonEmptyString(widget.title, `${basePath}.title`),
      layout: validateLayout(widget.layout, `${basePath}.layout`),
      config: validateConfig(widget.config ?? {}, `${basePath}.config`),
      dataSource:
        widget.dataSource === undefined
          ? undefined
          : validateDataSource(widget.dataSource, `${basePath}.dataSource`),
    };
  });
}

export function validateDashboardLayoutConfig(
  layoutConfig: unknown,
): DashboardLayoutContract {
  if (layoutConfig === undefined || layoutConfig === null) {
    return getDefaultDashboardLayoutConfig();
  }

  if (!isRecord(layoutConfig)) {
    throw new BadRequestException('layoutConfig must be an object');
  }

  const version = asFiniteNumber(layoutConfig.version, 'layoutConfig.version');
  if (version !== DASHBOARD_LAYOUT_VERSION) {
    throw new BadRequestException(
      `layoutConfig.version must be ${DASHBOARD_LAYOUT_VERSION}`,
    );
  }

  if (!isRecord(layoutConfig.grid)) {
    throw new BadRequestException('layoutConfig.grid must be an object');
  }
  const columns = asFiniteNumber(layoutConfig.grid.columns, 'layoutConfig.grid.columns');
  const rowHeight = asFiniteNumber(
    layoutConfig.grid.rowHeight,
    'layoutConfig.grid.rowHeight',
  );
  if (columns !== 12) {
    throw new BadRequestException('layoutConfig.grid.columns must be 12');
  }
  if (rowHeight < 16 || rowHeight > 96) {
    throw new BadRequestException(
      'layoutConfig.grid.rowHeight must be between 16 and 96',
    );
  }

  return {
    version: DASHBOARD_LAYOUT_VERSION,
    grid: {
      columns,
      rowHeight,
    },
    widgets: validateWidgets(layoutConfig.widgets),
  };
}
