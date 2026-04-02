/**
 * Widget Allowlist
 * Only widgets in this list can be created or updated in dashboards
 */
export const WIDGET_ALLOWLIST = [
  'project_health',
  'sprint_metrics',
  'resource_utilization',
  'conflict_trends',
  'budget_variance',
  'risk_summary',
  'portfolio_summary',
  'program_summary',
  // Phase 2B: Waterfall core widgets
  'critical_path_risk',
  'earned_value_summary',
  // Operational dashboard card engine
  'my_tasks_today',
  'overdue_tasks',
  'blocked_tasks',
  'tasks_by_status',
  'projects_at_risk',
  'upcoming_deadlines',
  'milestone_progress',
  'workload_distribution',
  'resource_capacity',
  'active_risks',
] as const;

export type WidgetKey = (typeof WIDGET_ALLOWLIST)[number];

export function isWidgetKeyAllowed(key: string): boolean {
  return (WIDGET_ALLOWLIST as readonly string[]).includes(key);
}
