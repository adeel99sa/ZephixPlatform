import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDashboards } from '@/features/dashboards/useDashboards';
import { track } from '@/lib/telemetry';

export function DashboardSwitcher({ workspaceId }: { workspaceId?: string }) {
  const { items } = useDashboards(workspaceId);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const loc = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => items.filter(d => d.name.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative" data-testid="dashboard-switcher">
      <button
        type="button"
        className="rounded-md px-2 py-1 hover:bg-neutral-100 focus:outline-none focus:ring-2"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            track('ui.dashboard.switcher.open');
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        Dashboards ▾
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Dashboards"
          className="absolute right-0 z-50 mt-2 w-72 rounded-md border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dashboards…"
            aria-label="Search dashboards"
            className="mb-2 w-full rounded-md border border-neutral-200 bg-transparent p-2 text-sm outline-none focus:ring-2 dark:border-neutral-700"
            data-testid="dashboard-switcher-search"
          />
          <div className="max-h-72 overflow-auto">
            {filtered.map((d) => (
              <button
                key={d.id}
                role="menuitem"
                className="w-full rounded-md px-2 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => {
                  track('ui.dashboard.switcher.select', { id: d.id });
                  setOpen(false);
                  const isBuilder = loc.pathname.includes('/edit');
                  navigate(isBuilder ? `/dashboards/${d.id}/edit` : `/dashboards/${d.id}`);
                }}
                data-testid={`dashboard-switcher-item-${d.id}`}
              >
                {d.name}
              </button>
            ))}
            {!filtered.length && (
              <div className="px-2 py-4 text-sm text-neutral-500">No dashboards found</div>
            )}
          </div>
          <div className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
            <button
              className="w-full rounded-md px-2 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => {
                setOpen(false);
                // open create modal via page action
                const btn = document.querySelector('[data-testid="create-dashboard-button"]') as HTMLButtonElement | null;
                btn?.click();
              }}
              data-testid="dashboard-switcher-create"
            >
              + Create dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}