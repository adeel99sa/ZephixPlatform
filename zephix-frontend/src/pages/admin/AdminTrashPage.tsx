import { useState, useEffect } from 'react';
import { restoreDashboard } from '@/features/dashboards/api';
import { track } from '@/lib/telemetry';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface TrashItem {
  id: string;
  name: string;
  type: 'dashboard' | 'workspace';
  deletedAt: string;
}

export default function AdminTrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrashItems();
  }, []);

  const loadTrashItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch trash items from backend
      const response = await apiClient.get('/admin/trash', { params: { type: 'workspace' } });
      const trashData = Array.isArray(response.data) ? response.data : [];

      // Transform backend data to TrashItem format
      const transformedItems: TrashItem[] = trashData.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: 'workspace', // Backend returns workspaces for now
        deletedAt: item.deletedAt || item.deleted_at,
      }));

      setItems(transformedItems);
    } catch (err: any) {
      console.error('Failed to load trash items:', err);
      setError(err?.response?.data?.message || 'Failed to load trash items');
      toast.error('Failed to load trash items');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: TrashItem) => {
    try {
      if (item.type === 'workspace') {
        // Restore workspace
        await apiClient.post(`/workspaces/${item.id}/restore`);
        track('ui.workspace.restore.success', { id: item.id });
        toast.success('Workspace restored successfully');
      } else if (item.type === 'dashboard') {
        await restoreDashboard(item.id);
        track('ui.db.restore.success', { id: item.id });
        toast.success('Dashboard restored successfully');
      }

      // Remove from list
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error: any) {
      track('ui.restore.error', { id: item.id });
      console.error('Failed to restore item:', error);
      toast.error(error?.response?.data?.message || 'Failed to restore item');
    }
  };

  const handlePurge = async (item: TrashItem) => {
    if (!confirm(`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.post('/admin/trash/purge', { id: item.id });
      toast.success('Item permanently deleted');
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error: any) {
      console.error('Failed to purge item:', error);
      toast.error(error?.response?.data?.message || 'Failed to permanently delete item');
    }
  };

  const handlePurgeOld = async () => {
    if (!confirm('Are you sure you want to permanently delete all items older than 30 days? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.post('/admin/trash/purge', { days: 30 });
      toast.success('Old items purged successfully');
      loadTrashItems();
    } catch (error: any) {
      console.error('Failed to purge old items:', error);
      toast.error(error?.response?.data?.message || 'Failed to purge old items');
    }
  };

  return (
    <div className="p-6" data-testid="admin-trash-page">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
        <button
          onClick={handlePurgeOld}
          className="mt-2 rounded border px-3 py-1.5 hover:bg-gray-50"
        >
          Purge &gt;30 days
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
              <div><div className="font-medium">No deleted items</div></div>
            </li>
          ) : (
            items.map(item => (
              <li key={item.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.type} • Deleted {new Date(item.deletedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(item)}
                    className="text-sm text-blue-600 hover:underline"
                    data-testid={`restore-${item.id}`}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handlePurge(item)}
                    className="text-sm text-red-600 hover:underline"
                    data-testid={`purge-${item.id}`}
                  >
                    Delete Permanently
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
