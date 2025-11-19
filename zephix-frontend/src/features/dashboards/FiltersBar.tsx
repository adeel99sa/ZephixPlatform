import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEFAULT_FILTERS, DashboardFilters, mergeFilters, parseFiltersFromUrl, filtersToUrl } from './filters';
import { track } from '@/lib/telemetry';

type Props = {
  storageKey: string;                    // e.g., `dash:<id>:filters`
  onApply: (filters: DashboardFilters) => void;
};

export default function FiltersBar({ storageKey, onApply }: Props) {
  const loc = useLocation();
  const navigate = useNavigate();
  const fromUrl = useMemo(() => parseFiltersFromUrl(loc.search), [loc.search]);

  const [filters, setFilters] = useState<DashboardFilters>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? mergeFilters(DEFAULT_FILTERS, JSON.parse(raw)) : mergeFilters(DEFAULT_FILTERS, fromUrl);
    } catch { return mergeFilters(DEFAULT_FILTERS, fromUrl); }
  });

  useEffect(() => {
    setFilters((cur) => mergeFilters(cur, fromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.search]);

  // On mount, if localStorage has filters but URL doesn't, apply them to URL
  useEffect(() => {
    if (!loc.search) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const stored = JSON.parse(raw);
          const url = filtersToUrl(mergeFilters(DEFAULT_FILTERS, stored));
          navigate({ search: url }, { replace: true });
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = () => {
    localStorage.setItem(storageKey, JSON.stringify(filters));
    navigate({ search: filtersToUrl(filters) }, { replace: true });
    track('ui.dashboard.view.filters.apply', { filters });
    onApply(filters);
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="dashboard-filters">
      <select
        className="rounded-md border px-2 py-1 text-sm"
        value={filters.timeRange}
        onChange={(e) => setFilters({ ...filters, timeRange: e.target.value as any })}
        data-testid="filters-tr"
        aria-label="Time range"
      >
        <option value="7d">Last 7 days</option>
        <option value="14d">Last 14 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </select>

      <select
        className="rounded-md border px-2 py-1 text-sm"
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
        data-testid="filters-status"
        aria-label="Status"
      >
        <option value="all">All</option>
        <option value="ontrack">On Track</option>
        <option value="atrisk">At Risk</option>
        <option value="blocked">Blocked</option>
      </select>

      <input
        className="rounded-md border px-2 py-1 text-sm"
        placeholder="Owner email"
        value={filters.owner ?? ''}
        onChange={(e) => setFilters({ ...filters, owner: e.target.value || undefined })}
        data-testid="filters-owner"
        aria-label="Owner"
      />

      <button className="rounded-md border px-3 py-1 text-sm hover:bg-neutral-100"
        onClick={apply}
        data-testid="filters-apply"
      >
        Apply
      </button>
    </div>
  );
}
