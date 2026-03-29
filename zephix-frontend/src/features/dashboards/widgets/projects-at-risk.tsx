// Phase 4.3: Projects At Risk — EVM-ready contract; live data from project-health until dedicated API exists.
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import type { WidgetBaseProps } from './types';
import { useProjectsAtRisk } from './useProjectsAtRisk';

export function ProjectsAtRiskWidget({ widget, filters }: WidgetBaseProps) {
  const navigate = useNavigate();
  const { loading, error, data } = useProjectsAtRisk({ filters });

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--zs-shadow-card)]" data-testid={`widget-${widget.id}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
            {widget.title || 'Projects At Risk'}
          </h3>
        </div>
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 p-4"
        data-testid={`widget-${widget.id}`}
      >
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{widget.title || 'Projects At Risk'}</h3>
        <p className="text-sm text-red-800">
          Widget data unavailable{error.requestId ? ` (RequestId: ${error.requestId})` : ''}
        </p>
        <p className="mt-1 text-xs text-red-600">{error.message}</p>
      </div>
    );
  }

  if (!data || data.projects.length === 0) {
    return (
      <div
        className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--zs-shadow-card)]"
        data-testid={`widget-${widget.id}`}
      >
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-emerald-500" aria-hidden />
          {widget.title || 'Projects At Risk'}
        </h3>
        <div className="mb-1 text-2xl" aria-hidden>
          🎉
        </div>
        <p className="text-sm font-medium text-slate-700">No projects at risk</p>
        <p className="text-xs text-slate-500">SPI/CPI and risk register within thresholds</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--zs-shadow-card)]"
      data-testid={`widget-${widget.id}`}
    >
      <header className="mb-3 flex items-start justify-between gap-2 pb-1">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
            {widget.title || 'Projects At Risk'}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {data.atRiskCount} of {data.totalProjects} projects need attention
          </p>
        </div>
        <span className="text-2xl font-bold tabular-nums text-slate-900">{data.atRiskCount}</span>
      </header>

      <div className="space-y-3">
        {data.projects.map((project) => {
          const critical = project.riskLevel === 'critical';
          return (
            <div
              key={project.id}
              className={`cursor-pointer rounded-lg border-l-4 p-3 transition-colors ${
                critical
                  ? 'border-red-500 bg-red-50/80 hover:bg-red-50'
                  : 'border-amber-500 bg-amber-50/80 hover:bg-amber-50'
              }`}
              onClick={() => navigate(`/projects/${project.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${project.id}`)}
              role="button"
              tabIndex={0}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate font-medium text-slate-900">{project.name}</span>
                {project.spi != null ? (
                  <div className="flex shrink-0 items-center gap-1 text-sm">
                    <TrendingDown className="h-4 w-4 text-red-500" aria-hidden />
                    <span
                      className={
                        project.spi < 0.9 ? 'font-semibold text-red-600' : 'font-medium text-amber-700'
                      }
                    >
                      SPI {project.spi.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      critical ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {critical ? 'Critical' : 'Warning'}
                  </span>
                )}
              </div>

              {project.cpi != null ? (
                <p className="text-xs text-slate-600">CPI {project.cpi.toFixed(2)}</p>
              ) : null}

              {project.daysOverdue > 0 ? (
                <p className="text-sm text-red-600">{project.daysOverdue} days behind schedule</p>
              ) : null}

              {project.blockedProjects.length > 0 ? (
                <p className="text-xs text-slate-500">↳ Blocks: {project.blockedProjects.join(', ')}</p>
              ) : null}

              {project.primaryRisk ? (
                <p className="mt-1 text-xs text-slate-600">Risk: {project.primaryRisk}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="mt-3 w-full pt-2 text-center text-sm font-medium text-blue-600 hover:text-blue-700"
        onClick={() => navigate('/projects')}
      >
        View all projects →
      </button>
    </div>
  );
}
