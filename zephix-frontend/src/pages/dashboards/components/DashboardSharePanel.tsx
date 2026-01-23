import { useEffect, useMemo, useState } from 'react';
import { dashboardSharesApi, DashboardShare, ShareAccessLevel } from '@/features/dashboards/dashboard-shares.api';

type Props = {
  scope: 'ORG' | 'WORKSPACE';
  dashboardId: string;
  workspaceId?: string;
};

export default function DashboardSharePanel(props: Props) {
  const [items, setItems] = useState<DashboardShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<ShareAccessLevel>('VIEW');
  const [exportAllowed, setExportAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(
    () => `${props.scope}:${props.workspaceId ?? ''}:${props.dashboardId}`,
    [props.scope, props.workspaceId, props.dashboardId],
  );

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res =
        props.scope === 'ORG'
          ? await dashboardSharesApi.listOrgShares(props.dashboardId)
          : await dashboardSharesApi.listWorkspaceShares(props.workspaceId as string, props.dashboardId);

      setItems(res);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load shares');
      console.error('Failed to load shares:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [key]);

  async function onInvite() {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (props.scope === 'ORG') {
        await dashboardSharesApi.createOrgShare(props.dashboardId, {
          email: email.trim(),
          accessLevel,
          exportAllowed,
        });
      } else {
        await dashboardSharesApi.createWorkspaceShare(props.workspaceId as string, props.dashboardId, {
          email: email.trim(),
          accessLevel,
          exportAllowed,
        });
      }
      setEmail('');
      setAccessLevel('VIEW');
      setExportAllowed(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Invite failed');
      console.error('Failed to invite user:', e);
    } finally {
      setBusy(false);
    }
  }

  async function onUpdate(shareId: string, nextLevel: ShareAccessLevel, nextExportAllowed?: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (props.scope === 'ORG') {
        await dashboardSharesApi.updateOrgShare(props.dashboardId, shareId, {
          accessLevel: nextLevel,
          exportAllowed: nextExportAllowed,
        });
      } else {
        await dashboardSharesApi.updateWorkspaceShare(
          props.workspaceId as string,
          props.dashboardId,
          shareId,
          {
            accessLevel: nextLevel,
            exportAllowed: nextExportAllowed,
          },
        );
      }
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Update failed');
      console.error('Failed to update share:', e);
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(shareId: string) {
    if (!confirm('Are you sure you want to revoke access?')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (props.scope === 'ORG') {
        await dashboardSharesApi.deleteOrgShare(props.dashboardId, shareId);
      } else {
        await dashboardSharesApi.deleteWorkspaceShare(props.workspaceId as string, props.dashboardId, shareId);
      }
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Revoke failed');
      console.error('Failed to revoke share:', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 16,
        backgroundColor: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Access Control</div>
        <button
          onClick={load}
          disabled={busy || loading}
          style={{
            padding: '6px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            backgroundColor: '#ffffff',
            cursor: busy || loading ? 'not-allowed' : 'pointer',
            opacity: busy || loading ? 0.5 : 1,
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@company.com"
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy && email.trim()) {
              onInvite();
            }
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
          }}
        />
        <select
          value={accessLevel}
          onChange={(e) => setAccessLevel(e.target.value as ShareAccessLevel)}
          disabled={busy}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          <option value="VIEW">View</option>
          <option value="EDIT">Edit</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={exportAllowed}
            onChange={(e) => setExportAllowed(e.target.checked)}
            disabled={busy}
          />
          Export
        </label>
        <button
          onClick={onInvite}
          disabled={busy || !email.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: busy || !email.trim() ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: busy || !email.trim() ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          {busy ? 'Inviting...' : 'Invite'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <div>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', opacity: 0.6 }}>Loading shares...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', opacity: 0.6 }}>No invites yet</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {items.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  backgroundColor: '#f9fafb',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {s.invitedUserName || s.invitedUserEmail || `User ${s.invitedUserId.slice(0, 8)}...`}
                  </div>
                  {s.invitedUserEmail && s.invitedUserName && (
                    <div style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>{s.invitedUserEmail}</div>
                  )}
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>
                    {s.access} {s.exportAllowed && '• Export'}
                  </div>
                  <div style={{ opacity: 0.5, fontSize: 11, marginTop: 4 }}>
                    Invited {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <select
                  disabled={busy}
                  value={s.access}
                  onChange={(e) => onUpdate(s.id, e.target.value as ShareAccessLevel)}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  <option value="VIEW">View</option>
                  <option value="EDIT">Edit</option>
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={s.exportAllowed}
                    onChange={(e) => onUpdate(s.id, s.access, e.target.checked)}
                    disabled={busy}
                  />
                  Export
                </label>

                <button
                  onClick={() => onRevoke(s.id)}
                  disabled={busy}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '8px 12px',
          backgroundColor: '#f3f4f6',
          borderRadius: 6,
          fontSize: 12,
          opacity: 0.7,
        }}
      >
        <strong>Note:</strong> Viewer role users will always have view-only access, even if invited with edit
        permission.
      </div>
    </div>
  );
}
