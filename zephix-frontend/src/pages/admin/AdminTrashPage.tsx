import { useState, useEffect, useCallback } from 'react';
import { restoreDashboard } from '@/features/dashboards/api';
import { restoreProject } from '@/features/projects/api';
import { track } from '@/lib/telemetry';
import { apiClient } from '@/lib/api/client';
import { PLATFORM_TRASH_RETENTION_DAYS } from '@/lib/platformRetention';
import { toast } from 'sonner';

interface TrashItem {
  id: string;
  name: string;
  type: 'dashboard' | 'workspace' | 'project';
  deletedAt: string;
  defaultRetentionDays?: number;
  purgeEligibleAt?: string;
  purgeEligible?: boolean;
}

export default function AdminTrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState(PLATFORM_TRASH_RETENTION_DAYS);

  const loadRetentionPolicy = useCallback(async () => {
    try {
      const policy = await apiClient.get<{ defaultRetentionDays?: number }>(
        '/admin/trash/retention-policy',
      );
      const d =
        typeof policy?.defaultRetentionDays === 'number' &&
        policy.defaultRetentionDays > 0
          ? policy.defaultRetentionDays
          : PLATFORM_TRASH_RETENTION_DAYS;
      setRetentionDays(d);
    } catch {
      setRetentionDays(PLATFORM_TRASH_RETENTION_DAYS);
    }
  }, []);

  const loadTrashItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // apiClient.get returns the payload (often an unwrapped array); tolerate { data } shapes.
      const raw = await apiClient.get<TrashItem[] | { data?: TrashItem[] }>(
        '/admin/trash',
        { params: { type: 'all' } },
      );
      const trashData = Array.isArray(raw)
        ? raw
        : (raw as { data?: TrashItem[] })?.data ?? [];

      setItems(trashData);
    } catch (err: unknown) {
      console.error('Failed to load trash items:', err);
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : 'Failed to load trash items';
      setError(msg || 'Failed to load trash items');
      toast.error('Failed to load trash items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRetentionPolicy();
  }, [loadRetentionPolicy]);

  useEffect(() => {
    void loadTrashItems();
  }, [loadTrashItems]);

  const handleRestore = async (item: TrashItem) => {
    try {
      if (item.type === 'workspace') {
        await apiClient.post(`/workspaces/${item.id}/restore`);
        track('ui.workspace.restore.success', { id: item.id });
        toast.success('Workspace restored successfully');
      } else if (item.type === 'project') {
        await restoreProject(item.id);
        track('ui.project.restore.success', { id: item.id });
        toast.success('Project restored successfully');
      } else if (item.type === 'dashboard') {
        await restoreDashboard(item.id);
        track('ui.db.restore.success', { id: item.id });
        toast.success('Dashboard restored successfully');
      }

      setItems((prev) => prev.filter((i) => !(i.type === item.type && i.id === item.id)));
    } catch (error: unknown) {
      track('ui.restore.error', { id: item.id });
      console.error('Failed to restore item:', error);
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message)
          : 'Failed to restore item';
      toast.error(msg || 'Failed to restore item');
    }
  };

  const handlePurge = async (item: TrashItem) => {
    if (
      !confirm(
        `Permanently delete “${item.name}”? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await apiClient.post('/admin/trash/purge', {
        id: item.id,
        entityType: item.type === 'project' ? 'project' : 'workspace',
      });
      toast.success('Item permanently deleted');
      setItems((prev) => prev.filter((i) => !(i.type === item.type && i.id === item.id)));
    } catch (error: unknown) {
      console.error('Failed to purge item:', error);
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message)
          : 'Failed to permanently delete item';
      toast.error(msg || 'Failed to permanently delete item');
    }
  };

  const handlePurgeOld = async () => {
    if (
      !confirm(
        `Permanently remove all workspaces and projects in Archive & delete older than ${retentionDays} days? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const raw = await apiClient.post<{
        data?: { workspacesPurged?: number; projectsPurged?: number };
        workspacesPurged?: number;
        projectsPurged?: number;
      }>('/admin/trash/purge', { days: retentionDays });
      const result = (raw as { data?: typeof raw })?.data ?? raw;
      const ws = result?.workspacesPurged ?? 0;
      const pr = result?.projectsPurged ?? 0;
      toast.success(`Purge complete: ${ws} workspace(s), ${pr} project(s) removed.`);
      loadTrashItems();
    } catch (error: unknown) {
      console.error('Failed to purge old items:', error);
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message)
          : 'Failed to purge old items';
      toast.error(msg || 'Failed to purge old items');
    }
  };

  return (
    <div className="p-6" data-testid="admin-trash-page">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Archive &amp; delete</h1>
        <button
          type="button"
          onClick={handlePurgeOld}
          className="mt-2 rounded border px-3 py-1.5 hover:bg-gray-50"
        >
          Purge older than {retentionDays} days
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-4">Loading...</div>
      ) : (
        <ul className="mt-4 divide-y rounded-xl border">
          {items.length === 0 ? (
            <li className="flex items-center justify-between p-3">
              <div><div className="font-medium">Nothing in Archive &amp; delete</div></div>
            </li>
          ) : (
            items.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between p-3"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.type}
                    {' · '}
                    Removed {new Date(item.deletedAt).toLocaleString()}
                    {item.purgeEligibleAt ? (
                      <>
                        {' · '}
                        Eligible for auto-purge after{' '}
                        {new Date(item.purgeEligibleAt).toLocaleDateString()}
                        {item.purgeEligible ? ' (past retention)' : ''}
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRestore(item)}
                    className="text-sm text-blue-600 hover:underline"
                    data-testid={`restore-${item.type}-${item.id}`}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePurge(item)}
                    className="text-sm text-red-600 hover:underline"
                    data-testid={`purge-${item.type}-${item.id}`}
                  >
                    Delete permanently
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
