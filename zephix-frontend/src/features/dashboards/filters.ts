export type DashboardFilters = {
  timeRange: '7d'|'14d'|'30d'|'90d'|'custom';
  owner?: string;
  status?: 'all'|'ontrack'|'atrisk'|'blocked';
  from?: string; // ISO
  to?: string;   // ISO
};

export const DEFAULT_FILTERS: DashboardFilters = { timeRange: '30d', status: 'all' };

export function parseFiltersFromUrl(search: string): DashboardFilters {
  const p = new URLSearchParams(search);
  const base: DashboardFilters = {
    timeRange: (p.get('tr') as any) || '30d',
    owner: p.get('owner') || undefined,
    status: (p.get('status') as any) || 'all',
    from: p.get('from') || undefined,
    to: p.get('to') || undefined,
  };
  return base;
}

export function filtersToUrl(f: DashboardFilters): string {
  const p = new URLSearchParams();
  if (f.timeRange) p.set('tr', f.timeRange);
  if (f.owner) p.set('owner', f.owner);
  if (f.status) p.set('status', f.status);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  return `?${p.toString()}`;
}

export function mergeFilters(a: DashboardFilters, b: Partial<DashboardFilters>): DashboardFilters {
  return { ...a, ...b };
}
