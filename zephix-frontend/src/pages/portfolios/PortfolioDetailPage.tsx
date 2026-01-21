/**
 * PHASE 6 MODULE 4: Portfolio Detail Page
 *
 * Shows portfolio details with rollup data
 */
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import { isAdminUser } from '@/utils/roles';

type PortfolioRollup = {
  version: number;
  portfolio: {
    id: string;
    name: string;
    status: string;
    workspaceId: string;
  };
  totals: {
    programsTotal: number;
    projectsTotal: number;
    projectsActive: number;
    projectsAtRisk: number;
    workItemsOpen: number;
    workItemsOverdue: number;
    resourceConflictsOpen: number;
    risksActive: number;
  };
  health: {
    status: 'green' | 'yellow' | 'red';
    reasons: string[];
    updatedAt: string;
  };
  programs: Array<{
    id: string;
    name: string;
    status: string;
    projectsTotal: number;
    projectsAtRisk: number;
    healthStatus: string | null;
  }>;
  projectsDirect: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    healthStatus: string | null;
  }>;
};

export default function PortfolioDetailPage() {
  const { workspaceId, portfolioId } = useParams<{ workspaceId: string; portfolioId: string }>();
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const { user } = useAuth();
  const navigate = useNavigate();

  const wsId = workspaceId || activeWorkspaceId;

  const [rollup, setRollup] = useState<PortfolioRollup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wsId || !portfolioId) {
      setError('Workspace ID and Portfolio ID required');
      setLoading(false);
      return;
    }
    loadPortfolioData();
  }, [wsId, portfolioId]);

  async function loadPortfolioData() {
    if (!wsId || !portfolioId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get<{ data: PortfolioRollup }>(
        `/workspaces/${wsId}/portfolios/${portfolioId}/rollup`
      );
      setRollup(response.data);
    } catch (err: any) {
      console.error('Failed to load portfolio:', err);
      if (err?.response?.status === 404) {
        setError('Portfolio not found');
      } else {
        setError('Failed to load portfolio');
      }
    } finally {
      setLoading(false);
    }
  }

  function getHealthColor(status: 'green' | 'yellow' | 'red'): string {
    switch (status) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  }

  function getHealthStatusColor(healthStatus: string | null): string {
    if (!healthStatus) return 'bg-gray-100 text-gray-600';
    const normalized = healthStatus.toLowerCase();
    if (normalized === 'green' || normalized === 'healthy') return 'bg-green-100 text-green-800';
    if (normalized === 'yellow' || normalized === 'at_risk') return 'bg-yellow-100 text-yellow-800';
    if (normalized === 'red' || normalized === 'blocked') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-600';
  }

  if (!wsId || !portfolioId) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>Workspace ID and Portfolio ID required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading portfolio...</div>
      </div>
    );
  }

  if (error || !rollup) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Portfolio not found'}</p>
          <button
            onClick={() => navigate(`/workspaces/${wsId}/portfolios`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to portfolios
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = isAdminUser(user);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to={`/workspaces/${wsId}/portfolios`} className="hover:text-gray-700">
            Portfolios
          </Link>
          <span>→</span>
          <span>{rollup.portfolio.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{rollup.portfolio.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Status: {rollup.portfolio.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className={`mb-6 p-4 border rounded-lg ${getHealthColor(rollup.health.status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium mb-1">Health: {rollup.health.status.toUpperCase()}</div>
            {rollup.health.reasons.length > 0 && (
              <div className="text-sm mt-1">
                {rollup.health.reasons.join(' · ')}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-600">
            Updated: {new Date(rollup.health.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Rollup Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <MetricCard title="Programs Total" value={rollup.totals.programsTotal} />
        <MetricCard title="Projects Total" value={rollup.totals.projectsTotal} />
        <MetricCard title="Projects Active" value={rollup.totals.projectsActive} />
        <MetricCard title="Projects At Risk" value={rollup.totals.projectsAtRisk} variant="warning" />
        <MetricCard title="Work Items Open" value={rollup.totals.workItemsOpen} />
        <MetricCard title="Work Items Overdue" value={rollup.totals.workItemsOverdue} variant={rollup.totals.workItemsOverdue > 0 ? 'danger' : 'default'} />
        {rollup.totals.risksActive > 0 && (
          <MetricCard title="Risks Active" value={rollup.totals.risksActive} variant="warning" />
        )}
        {rollup.totals.resourceConflictsOpen > 0 && (
          <MetricCard title="Conflicts Open" value={rollup.totals.resourceConflictsOpen} variant="danger" />
        )}
      </div>

      {/* Programs List */}
      {rollup.programs.length > 0 && (
        <div className="border rounded-lg mb-6">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              Programs ({rollup.programs.length})
            </h2>
          </div>
          <div className="divide-y">
            {rollup.programs.map((program) => (
              <Link
                key={program.id}
                to={`/workspaces/${wsId}/programs/${program.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{program.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {program.projectsTotal} projects · {program.projectsAtRisk} at risk
                      {program.healthStatus && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded ${getHealthStatusColor(program.healthStatus)}`}>
                          {program.healthStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">→</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Direct Projects (not via programs) */}
      {rollup.projectsDirect.length > 0 && (
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              Direct Projects ({rollup.projectsDirect.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rollup.projectsDirect.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/projects/${project.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{project.status}</td>
                    <td className="px-4 py-3">
                      {project.healthStatus && (
                        <span className={`px-2 py-1 text-xs rounded ${getHealthStatusColor(project.healthStatus)}`}>
                          {project.healthStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {project.endDate ? new Date(project.endDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rollup.programs.length === 0 && rollup.projectsDirect.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-600">No programs or projects in this portfolio</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  variant = 'default'
}: {
  title: string;
  value: number;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: "border-gray-200 bg-white",
    warning: "border-yellow-200 bg-yellow-50",
    danger: "border-red-200 bg-red-50",
  };

  return (
    <div className={`p-4 border rounded-lg ${variantClasses[variant]}`}>
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
