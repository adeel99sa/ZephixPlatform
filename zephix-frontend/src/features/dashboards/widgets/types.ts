// Phase 4.3: Widget Shared Types
import type { DashboardWidget } from "../types";

export interface WidgetBaseProps {
  widget: DashboardWidget;
  filters: WidgetFilters;
  workspaceId: string | null;
}

export interface WidgetFilters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  projectId?: string;
  resourceId?: string;
}

export interface WidgetState<T = any> {
  loading: boolean;
  error: WidgetError | null;
  data: T | null;
}

export interface WidgetError {
  message: string;
  requestId?: string;
}


