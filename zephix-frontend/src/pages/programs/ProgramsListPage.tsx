/**
 * PHASE 6 MODULE 3: Programs List Page
 *
 * Lists all programs in a workspace
 * Uses GET /api/workspaces/:workspaceId/programs endpoint
 */
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import { isAdminUser } from '@/utils/roles';
import { getWorkspace } from '@/features/workspaces/workspace.api';

type Program = {
  id: string;
  name: string;
  status: string;
  portfolioId: string;
  portfolio?: {
    id: string;
    name: string;
  };
};

type Portfolio = {
  id: string;
  name: string;
  status: string;
};

export default function ProgramsListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const { user } = useAuth();
  const navigate = useNavigate();

  const wsId = workspaceId || activeWorkspaceId;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', portfolioId: '' });

  useEffect(() => {
    if (!wsId) {
      setError('Workspace ID required');
      setLoading(false);
      return;
    }
    loadPrograms();
  }, [wsId]);

  async function loadPrograms() {
    if (!wsId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch workspace name, portfolios, and programs in parallel
      const [workspaceResponse, portfoliosResponse, programsResponse] = await Promise.all([
        getWorkspace(wsId).catch(() => null),
        api.get<{ data: Portfolio[] }>(`/workspaces/${wsId}/portfolios`).catch(() => ({ data: [] })),
        api.get<{ data: Program[] }>(`/workspaces/${wsId}/programs`),
      ]);

      if (workspaceResponse) {
        setWorkspaceName(workspaceResponse.name);
      }
      const portfolioResult = portfoliosResponse as unknown as { data?: Portfolio[] };
      const programResult = programsResponse as unknown as { data?: Program[] };
      setPortfolios(portfolioResult?.data ?? []);
      setPrograms(programResult?.data ?? []);
    } catch (err: any) {
      console.error('Failed to load programs:', err);
      if (err?.response?.status === 404) {
        setError('Workspace not found');
      } else {
        setError('Failed to load programs');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!wsId) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>Select a workspace to view programs</p>
          <button
            onClick={() => navigate('/workspaces')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Go to workspaces
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading programs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/workspaces')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to workspaces
          </button>
        </div>
      </div>
    );
  }

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();
    if (!wsId || !formData.name.trim() || !formData.portfolioId) return;

    setCreating(true);
    setCreateError(null);

    try {
      const response = await api.post<{ data: Program }>(
        `/workspaces/${wsId}/portfolios/${formData.portfolioId}/programs`,
        {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          status: 'active',
        }
      );

      // Reload programs list
      await loadPrograms();
      setShowCreateModal(false);
      setFormData({ name: '', description: '', portfolioId: '' });
    } catch (err: any) {
      console.error('Failed to create program:', err);
      setCreateError(err?.response?.data?.message || 'Failed to create program');
    } finally {
      setCreating(false);
    }
  }

  const isAdmin = isAdminUser(user);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/workspaces" className="hover:text-gray-700">
          Workspaces
        </Link>
        {workspaceName && (
          <>
            <span>→</span>
            <Link to={`/workspaces/${wsId}`} className="hover:text-gray-700">
              {workspaceName}
            </Link>
          </>
        )}
        <span>→</span>
        <span>Programs</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Programs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {programs.length} program{programs.length !== 1 ? 's' : ''} in this workspace
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + New Program
            </button>
            {/* Hide "Manage Portfolios" link when feature is disabled */}
            {false && (
              <Link
                to={`/workspaces/${wsId}/portfolios`}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                Manage Portfolios
              </Link>
            )}
          </div>
        )}
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-600 mb-4">No programs found in this workspace</p>
          {isAdmin && (
            <div className="space-y-2">
              {portfolios.length === 0 ? (
                <Link
                  to={`/workspaces/${wsId}/portfolios`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Create a portfolio first
                </Link>
              ) : (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Create a program
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {programs.map((program) => (
            <Link
              key={program.id}
              to={`/workspaces/${wsId}/programs/${program.id}`}
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{program.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Portfolio: {program.portfolio?.name || 'Unknown'} · Status: {program.status}
                  </div>
                </div>
                <div className="text-sm text-gray-400">→</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Program Modal */}
      {showCreateModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Program</h3>

            <form onSubmit={handleCreateProgram}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.portfolioId}
                    onChange={(e) => setFormData({ ...formData, portfolioId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                    disabled={creating}
                  >
                    <option value="">Select a portfolio</option>
                    {portfolios.map((portfolio) => (
                      <option key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </option>
                    ))}
                  </select>
                  {portfolios.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      <Link to={`/workspaces/${wsId}/portfolios`} className="text-blue-600 hover:text-blue-800">
                        Create a portfolio first
                      </Link>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                    disabled={creating}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    disabled={creating}
                  />
                </div>

                {createError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {createError}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', description: '', portfolioId: '' });
                      setCreateError(null);
                    }}
                    disabled={creating}
                    className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !formData.name.trim() || !formData.portfolioId}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
