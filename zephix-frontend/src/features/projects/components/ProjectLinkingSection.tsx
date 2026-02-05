/**
 * PHASE 6 MODULE 5: Project Linking Section
 *
 * Admin-only UI to link project to program/portfolio
 * Shows read-only tag for Member/Guest
 */
import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import { isAdminUser } from '@/utils/roles';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

type Project = {
  id: string;
  name: string;
  programId?: string | null;
  portfolioId?: string | null;
  program?: { id: string; name: string } | null;
  portfolio?: { id: string; name: string } | null;
};

type Program = {
  id: string;
  name: string;
  portfolioId: string;
  portfolio?: { id: string; name: string } | null;
};

type Portfolio = {
  id: string;
  name: string;
};

interface Props {
  projectId: string;
  project?: Project | null;
  onUpdated?: () => void;
}

export function ProjectLinkingSection({ projectId, project, onUpdated }: Props) {
  const workspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');

  const isAdmin = isAdminUser(user);

  useEffect(() => {
    if (workspaceId && isAdmin && showLinkModal) {
      loadOptions();
    }
  }, [workspaceId, isAdmin, showLinkModal]);

  async function loadOptions() {
    if (!workspaceId) return;

    setLoading(true);
    try {
      // Load portfolios
      const portfoliosResponse = await api.get<{ data: Portfolio[] }>(
        `/workspaces/${workspaceId}/portfolios`
      );
      // Backend returns { data: Portfolio[] }
      const portfoliosList = portfoliosResponse.data?.data ?? portfoliosResponse.data ?? [];
      setPortfolios(portfoliosList as Portfolio[]);

      // Load all programs in workspace using new endpoint
      const programsResponse = await api.get<{ data: Program[] }>(
        `/workspaces/${workspaceId}/programs`
      );
      // Backend returns { data: Program[] }
      const allPrograms = programsResponse.data?.data ?? programsResponse.data ?? [];

      // Enrich programs with portfolio names from portfolios list
      const enrichedPrograms = (allPrograms as Program[]).map((program: Program) => {
        const portfolio = (portfoliosList as Portfolio[]).find((p: Portfolio) => p.id === program.portfolioId);
        return {
          ...program,
          portfolio: portfolio ? { id: portfolio.id, name: portfolio.name } : undefined,
        };
      });
      setPrograms(enrichedPrograms);

      // Pre-select current values
      if (project?.programId) {
        setSelectedProgramId(project.programId);
        const program = (allPrograms as Program[]).find((p: Program) => p.id === project.programId);
        if (program?.portfolioId) {
          setSelectedPortfolioId(program.portfolioId);
        }
      } else if (project?.portfolioId) {
        setSelectedPortfolioId(project.portfolioId);
      }
    } catch (error) {
      console.error('Failed to load linking options:', error);
      toast.error('Failed to load programs and portfolios');
    } finally {
      setLoading(false);
    }
  }

  async function handleLink() {
    if (!workspaceId || !projectId) return;

    setSaving(true);
    try {
      await api.patch(
        `/workspaces/${workspaceId}/projects/${projectId}/link`,
        {
          programId: selectedProgramId || undefined,
          portfolioId: selectedPortfolioId || undefined,
        }
      );

      toast.success('Project linked successfully');
      setShowLinkModal(false);
      setSelectedProgramId('');
      setSelectedPortfolioId('');
      if (onUpdated) {
        onUpdated();
      }
    } catch (error: any) {
      console.error('Failed to link project:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to link project';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink() {
    if (!workspaceId || !projectId) return;

    setSaving(true);
    try {
      await api.patch(
        `/workspaces/${workspaceId}/projects/${projectId}/link`,
        {
          programId: null,
          portfolioId: null,
        }
      );

      toast.success('Project unlinked successfully');
      setShowUnlinkConfirm(false);
      if (onUpdated) {
        onUpdated();
      }
    } catch (error: any) {
      console.error('Failed to unlink project:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to unlink project';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  function getProjectTag(): string {
    if (project?.programId && project?.program) {
      return `Program: ${project.program.name}`;
    }
    if (project?.portfolioId && project?.portfolio) {
      return `Portfolio: ${project.portfolio.name}`;
    }
    return 'Standalone';
  }

  // When program is selected, auto-set portfolio from program
  useEffect(() => {
    if (selectedProgramId) {
      const program = programs.find(p => p.id === selectedProgramId);
      if (program?.portfolioId) {
        setSelectedPortfolioId(program.portfolioId);
      }
    }
  }, [selectedProgramId, programs]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Program & Portfolio</h2>
        {isAdmin && (
          <div className="flex gap-2">
            {project?.programId || project?.portfolioId ? (
              <Button
                variant="outline"
                onClick={() => setShowUnlinkConfirm(true)}
                disabled={saving}
                className="text-sm"
              >
                Unlink
              </Button>
            ) : null}
            <Button
              onClick={() => setShowLinkModal(true)}
              disabled={saving}
              className="text-sm"
            >
              {project?.programId || project?.portfolioId ? 'Change Link' : 'Link Project'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Link Status
          </label>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 text-sm font-medium rounded ${
              project?.programId || project?.portfolioId
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              {getProjectTag()}
            </span>
          </div>
          {project?.programId && project?.program && (
            <p className="text-xs text-gray-500 mt-1">
              Portfolio: {project.portfolio?.name || 'Derived from program'}
            </p>
          )}
        </div>
        {!isAdmin && (
          <p className="text-xs text-gray-500">Read-only. Contact an admin to change linking.</p>
        )}
      </div>

      {/* Link Modal */}
      {showLinkModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Link Project</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program (optional)
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={loading}
                >
                  <option value="">None</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name} ({program.portfolio?.name || 'Unknown Portfolio'})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  If program is selected, portfolio will be derived automatically
                </p>
              </div>

              {selectedProgramId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio (derived from program)
                  </label>
                  <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600">
                    {programs.find(p => p.id === selectedProgramId)?.portfolio?.name || 'Unknown Portfolio'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Portfolio is automatically set from the selected program
                  </p>
                </div>
              )}

              {!selectedProgramId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio (optional, only if no program)
                  </label>
                  <select
                    value={selectedPortfolioId}
                    onChange={(e) => setSelectedPortfolioId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={loading || !!selectedProgramId}
                  >
                    <option value="">None</option>
                    {portfolios.map((portfolio) => (
                      <option key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLinkModal(false);
                    setSelectedProgramId('');
                    setSelectedPortfolioId('');
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLink}
                  disabled={saving || loading || (!selectedProgramId && !selectedPortfolioId)}
                >
                  {saving ? 'Linking...' : 'Link'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unlink Confirmation Modal */}
      {showUnlinkConfirm && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Unlink Project</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to unlink this project from {getProjectTag().toLowerCase()}?
              This will remove the project from the program/portfolio but will not delete the project.
            </p>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                onClick={() => setShowUnlinkConfirm(false)}
                disabled={saving}
                className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlink}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Unlinking...' : 'Unlink'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
