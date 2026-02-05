/**
 * PHASE 6 MODULE 3: Program Detail Page
 *
 * Shows program details with rollup data
 */
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import { isAdminUser } from '@/utils/roles';

type ProgramRollup = {
  version: number;
  program: {
    id: string;
    name: string;
    status: string;
    workspaceId: string;
    portfolioId: string | null;
  };
  totals: {
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
  projects: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    healthStatus: string | null;
  }>;
};

type Portfolio = {
  id: string;
  name: string;
  status: string;
};

export default function ProgramDetailPage() {
  const { workspaceId, programId } = useParams<{ workspaceId: string; programId: string }>();
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const { user } = useAuth();
  const navigate = useNavigate();

  const wsId = workspaceId || activeWorkspaceId;

  const [rollup, setRollup] = useState<ProgramRollup | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wsId || !programId) {
      setError('Workspace ID and Program ID required');
      setLoading(false);
      return;
    }
    loadProgramData();
  }, [wsId, programId]);

  async function loadProgramData() {
    if (!wsId || !programId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch program rollup
      const rollupResponse = await api.get<{ data: ProgramRollup }>(
        `/workspaces/${wsId}/programs/${programId}/rollup`
      );
      // Backend returns { data: ProgramRollup }
      const rollupData = rollupResponse.data?.data ?? rollupResponse.data as unknown as ProgramRollup;
      setRollup(rollupData);

      // Fetch portfolio if program has portfolioId
      if (rollupData.program?.portfolioId) {
        try {
          const portfolioResponse = await api.get<{ data: Portfolio }>(
            `/workspaces/${wsId}/portfolios/${rollupData.program.portfolioId}`
          );
          // Backend returns { data: Portfolio }
          setPortfolio(portfolioResponse.data?.data ?? portfolioResponse.data as unknown as Portfolio);
        } catch (err) {
          console.warn('Failed to load portfolio:', err);
        }
      }
    } catch (err: any) {
      console.error('Failed to load program:', err);
      if (err?.response?.status === 404) {
        setError('Program not found');
      } else {
        setError('Failed to load program');
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
    if (normalized === 'healthy') return 'bg-green-100 text-green-800';
    if (normalized === 'at_risk') return 'bg-yellow-100 text-yellow-800';
    if (normalized === 'blocked') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-600';
  }

  if (!wsId || !programId) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>Workspace ID and Program ID required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading program...</div>
      </div>
    );
  }

  if (error || !rollup) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Program not found'}</p>
          <button
            onClick={() => navigate(`/workspaces/${wsId}/programs`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to programs
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
          <Link to={`/workspaces/${wsId}/programs`} className="hover:text-gray-700">
            Programs
          </Link>
          <span>→</span>
          <span>{rollup.program.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{rollup.program.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Status: {rollup.program.status}</span>
              {portfolio && (
                <>
                  <span>·</span>
                  <Link
                    to={`/workspaces/${wsId}/portfolios/${portfolio.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Portfolio: {portfolio.name}
                  </Link>
                </>
              )}
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

      {/* Projects Table */}
      <div className="border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">
            Projects ({rollup.projects.length})
          </h2>
        </div>
        {rollup.projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No projects in this program
          </div>
        ) : (
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
                {rollup.projects.map((project) => (
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
        )}
      </div>
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
