import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orgDashboardsApi, OrgDashboard } from '@/features/dashboards/org-dashboards.api';
import { workspaceDashboardsApi, WorkspaceDashboard } from '@/features/dashboards/workspace-dashboards.api';
import DashboardSharePanel from './components/DashboardSharePanel';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { normalizePlatformRole } from '@/utils/roles';

// TODO: Phase 6.4 - Implement export job creation and status polling
async function handleExport(dashboardId: string, format: 'PDF' | 'XLSX', workspaceId?: string) {
  try {
    const url = workspaceId
      ? `/workspaces/${workspaceId}/dashboards/${dashboardId}/exports`
      : `/org/dashboards/${dashboardId}/exports`;
    
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('zephix.at')}`,
      },
      credentials: 'include',
      body: JSON.stringify({ format }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(error.message || 'Export failed');
    }

    const result = await response.json();
    alert(`Export job queued. Job ID: ${result.data?.jobId || 'N/A'}. Status will be available in Phase 6.4.`);
  } catch (e: any) {
    alert(`Export failed: ${e?.message || 'Unknown error'}`);
    console.error('Export error:', e);
  }
}

type Dashboard = OrgDashboard | WorkspaceDashboard;

export default function DashboardViewPage() {
  const { dashboardId, workspaceId } = useParams<{ dashboardId: string; workspaceId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role: workspaceRole } = useWorkspaceRole(workspaceId || null);
  const [item, setItem] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mode = useMemo(() => (workspaceId ? 'WORKSPACE' : 'ORG'), [workspaceId]);

  const platformRole = user?.platformRole || user?.role;
  const normalizedRole = normalizePlatformRole(platformRole);
  const isAdmin = normalizedRole === 'ADMIN';
  const isWorkspaceOwner = workspaceRole === 'OWNER' || isAdmin;
  const canManageShares = mode === 'ORG' ? isAdmin : (isAdmin || isWorkspaceOwner);

  useEffect(() => {
    if (!dashboardId) return;

    let mounted = true;
    (async () => {
      try {
        const res =
          mode === 'ORG'
            ? await orgDashboardsApi.get(dashboardId)
            : await workspaceDashboardsApi.get(workspaceId as string, dashboardId);

        if (mounted) setItem(res);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Failed to load dashboard');
          console.error('Failed to load dashboard:', e);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dashboardId, workspaceId, mode]);

  if (!dashboardId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: 'crimson' }}>Missing dashboard ID</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <div>Loading dashboard...</div>
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

  if (!item) {
    return (
      <div style={{ padding: 16 }}>
        <div>Dashboard not found</div>
      </div>
    );
  }

  // Determine export permission
  const exportAllowed =
    item.access?.exportAllowed === true ||
    item.access?.level === 'OWNER' ||
    (isAdmin && mode === 'ORG') ||
    (isWorkspaceOwner && mode === 'WORKSPACE');

  // Drilldown: Open work items list with same scope
  const handleOpenAsList = () => {
    const basePath = '/my-work';

    let f: WorkItemFilters = {
      status: 'active',
      dateRange: 'last_30_days',
    };

    if (mode === 'WORKSPACE' && workspaceId) {
      // Workspace-scoped: filter by workspace
      f = { ...f, workspaceId };
    } else {
      // Org-scoped: show at-risk and blocked items
      f = { ...f, health: ['at_risk', 'blocked'] };
    }

    const search = buildWorkItemSearch(f);
    navigate(`${basePath}${search}`);
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>{item.name}</div>
          {item.description && (
            <div style={{ opacity: 0.7, fontSize: 14, marginTop: 4 }}>{item.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleOpenAsList}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Open as List
          </button>
          {exportAllowed && (
            <>
              <button
                onClick={() => handleExport(dashboardId, 'PDF', workspaceId)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Export PDF
              </button>
              <button
                onClick={() => handleExport(dashboardId, 'XLSX', workspaceId)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: 24,
          minHeight: 400,
          backgroundColor: '#f9fafb',
        }}
      >
        <div style={{ opacity: 0.6, fontSize: 14 }}>Dashboard widgets render here</div>
        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.5 }}>
          Phase 6.2-6.3: Widgets and rollups will be implemented here
        </div>
      </div>

      {canManageShares && (
        <DashboardSharePanel scope={mode} dashboardId={dashboardId} workspaceId={workspaceId} />
      )}
    </div>
  );
}
