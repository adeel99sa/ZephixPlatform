import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { listWorkItems, createWorkItem } from '../api';
import type { WorkItem } from '../types';

export function WorkItemListView(props: { workspaceId: string; projectId: string }) {
  const { workspaceId, projectId } = props;

  const [items, setItems] = useState<WorkItem[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await listWorkItems(workspaceId, projectId);
      setItems(data);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load work items';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [workspaceId, projectId]);

  async function handleAdd() {
    const t = title.trim();
    if (!t || submitting) return;

    try {
      setSubmitting(true);
      await createWorkItem(workspaceId, projectId, { title: t });
      setTitle('');
      toast.success('Work item created');
      await load();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to create work item';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 16 }}>Loading work items...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add task title"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #ddd' }}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={submitting || !title.trim()}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #ddd',
            background: submitting ? '#ccc' : 'white',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Adding...' : 'Add'}
        </button>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 1fr 120px 120px 120px',
            padding: 10,
            fontWeight: 700,
            background: '#fafafa',
          }}
        >
          <div>ID</div>
          <div>Name</div>
          <div>Status</div>
          <div>Due</div>
          <div>Priority</div>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No work items yet</div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 120px 120px 120px',
                padding: 10,
                borderTop: '1px solid #f1f1f1',
              }}
            >
              <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{it.key}</div>
              <div>{it.title}</div>
              <div>{it.status}</div>
              <div>{it.dueDate || ''}</div>
              <div>{it.priority || ''}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
