import React, { useState, useEffect } from 'react';
import { WorkItem, listProjectWorkItems, createProjectWorkItem } from '../api';
import { WorkItemsTree } from './WorkItemsTree';
import { WorkItemDetailsPanel } from './WorkItemDetailsPanel';

interface WorkItemsSectionProps {
  projectId: string;
}

export const WorkItemsSection: React.FC<WorkItemsSectionProps> = ({ projectId }) => {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkItems();
  }, [projectId]);

  const loadWorkItems = async () => {
    setLoading(true);
    try {
      const items = await listProjectWorkItems(projectId);
      setWorkItems(items);
    } catch (error) {
      console.error('Failed to load work items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setCreateParentId(null);
    setShowCreateModal(true);
  };

  const handleCreateSubtask = (parentId: string) => {
    setCreateParentId(parentId);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (title: string, description?: string) => {
    try {
      await createProjectWorkItem(projectId, {
        title,
        description,
        parentId: createParentId || undefined,
      });
      await loadWorkItems();
      setShowCreateModal(false);
      setCreateParentId(null);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to create work item');
    }
  };

  if (loading && workItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Loading work items...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Work Items</h2>
      <div className="grid grid-cols-2 gap-4">
        <WorkItemsTree
          items={workItems}
          onSelect={setSelectedItem}
          onAddTask={handleCreateTask}
          onAddSubtask={handleCreateSubtask}
          selectedId={selectedItem?.id}
        />
        <WorkItemDetailsPanel
          workItem={selectedItem}
          projectId={projectId}
          allWorkItems={workItems}
          onRefresh={loadWorkItems}
        />
      </div>

      {showCreateModal && (
        <CreateWorkItemModal
          parentId={createParentId}
          onSubmit={handleCreateSubmit}
          onClose={() => {
            setShowCreateModal(false);
            setCreateParentId(null);
          }}
        />
      )}
    </div>
  );
};

const CreateWorkItemModal: React.FC<{
  parentId: string | null;
  onSubmit: (title: string, description?: string) => Promise<void>;
  onClose: () => void;
}> = ({ parentId, onSubmit, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), description.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          {parentId ? 'Create Subtask' : 'Create Task'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={submitting || !title.trim()}
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
