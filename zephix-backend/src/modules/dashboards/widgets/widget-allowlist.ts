/**
 * Widget Allowlist
 * Only widgets in this list can be created or updated in dashboards
 */
export const WIDGET_ALLOWLIST = [
  'project_health',
  'sprint_metrics',
  'sprint_progress',
  'resource_utilization',
  'conflict_trends',
  'budget_variance',
  'risk_summary',
  'portfolio_summary',
  'program_summary',
] as const;

export type WidgetKey = (typeof WIDGET_ALLOWLIST)[number];

export function isWidgetKeyAllowed(key: string): boolean {
  return (WIDGET_ALLOWLIST as readonly string[]).includes(key);
}
