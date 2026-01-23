import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { workspaceDashboardsApi, WorkspaceDashboard } from '@/features/dashboards/workspace-dashboards.api';
import { dashboardRoutes } from '@/routes/dashboardRoutes';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { normalizePlatformRole } from '@/utils/roles';
import { CreateDashboardModal } from './components/CreateDashboardModal';

export default function WorkspaceDashboardsListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role: workspaceRole } = useWorkspaceRole(workspaceId || null);
  const [items, setItems] = useState<WorkspaceDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const platformRole = user?.platformRole || user?.role;
  const normalizedRole = normalizePlatformRole(platformRole);
  const isAdmin = normalizedRole === 'ADMIN';
  const isWorkspaceOwner = workspaceRole === 'OWNER' || isAdmin;
  const canCreate = isAdmin || isWorkspaceOwner;

  if (!workspaceId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: 'crimson' }}>Missing workspace ID</div>
      </div>
    );
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await workspaceDashboardsApi.list(workspaceId);
        if (mounted) setItems(res);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Failed to load dashboards');
          console.error('Failed to load workspace dashboards:', e);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  const handleCreate = async (input: { name: string; description?: string }) => {
    if (!workspaceId) return;
    const created = await workspaceDashboardsApi.create(workspaceId, input);
    navigate(dashboardRoutes.wsView(workspaceId, created.id));
  };

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <div>Loading dashboards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: 'crimson' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <h2>Workspace Dashboards</h2>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Create Dashboard
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', opacity: 0.7 }}>
          {canCreate
            ? 'No dashboards yet. Create one to get started.'
            : 'No dashboards available.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((d) => (
            <Link
              key={d.id}
              to={dashboardRoutes.wsView(workspaceId, d.id)}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{d.name}</div>
                {d.description && (
                  <div style={{ opacity: 0.7, fontSize: 14, marginTop: 4 }}>{d.description}</div>
                )}
                <div style={{ opacity: 0.5, fontSize: 12, marginTop: 8 }}>
                  Updated {new Date(d.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateDashboardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        scopeLabel="Workspace"
        onCreate={handleCreate}
      />
    </div>
  );
}
