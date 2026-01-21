import React, { useState, useEffect } from 'react';
import { WorkItem, DependencyRow, listWorkItemDependencies, deleteWorkItemDependency } from '../api';
import AddDependencyModal from './AddDependencyModal';

interface WorkItemDetailsPanelProps {
  workItem: WorkItem | null;
  projectId: string;
  allWorkItems: WorkItem[];
  onRefresh: () => void;
}

export const WorkItemDetailsPanel: React.FC<WorkItemDetailsPanelProps> = ({
  workItem,
  projectId,
  allWorkItems,
  onRefresh,
}) => {
  const [dependencies, setDependencies] = useState<DependencyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (workItem) {
      loadDependencies();
    } else {
      setDependencies([]);
    }
  }, [workItem, projectId]);

  const loadDependencies = async () => {
    if (!workItem) return;
    setLoading(true);
    try {
      const deps = await listWorkItemDependencies(projectId, workItem.id);
      setDependencies(deps);
    } catch (error) {
      console.error('Failed to load dependencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDependencyAdded = () => {
    loadDependencies();
    onRefresh();
  };

  const handleDeleteDependency = async (depId: string) => {
    if (!workItem) return;
    if (!confirm('Delete this dependency?')) return;
    try {
      await deleteWorkItemDependency(projectId, workItem.id, depId);
      await loadDependencies();
      onRefresh();
    } catch (error) {
      console.error('Failed to delete dependency:', error);
    }
  };

  if (!workItem) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-gray-500 text-center py-8">Select a work item to view details</p>
      </div>
    );
  }

  const blockedBy = dependencies.filter((d) => d.successorId === workItem.id);
  const blocking = dependencies.filter((d) => d.predecessorId === workItem.id);

  const getWorkItemTitle = (id: string, dep?: DependencyRow) => {
    // First try to get from enriched dependency data
    if (dep) {
      if (dep.predecessorId === id && dep.predecessorTitle) {
        return `${dep.predecessorTitle}${dep.predecessorProjectName ? ` (${dep.predecessorProjectName})` : ''}`;
      }
      if (dep.successorId === id && dep.successorTitle) {
        return `${dep.successorTitle}${dep.successorProjectName ? ` (${dep.successorProjectName})` : ''}`;
      }
    }
    // Fallback to tree search
    const findInTree = (items: WorkItem[]): WorkItem | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findInTree(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    const found = findInTree(allWorkItems);
    return found?.title || id;
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">{workItem.title}</h3>
        {workItem.description && (
          <p className="text-gray-600 text-sm mb-2">{workItem.description}</p>
        )}
        <span
          className={`inline-block px-2 py-1 text-xs rounded ${
            workItem.status === 'done'
              ? 'bg-green-100 text-green-800'
              : workItem.status === 'in_progress'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {workItem.status}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Blocked By</h4>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              + Add Dependency
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : blockedBy.length === 0 ? (
            <p className="text-sm text-gray-500">No dependencies</p>
          ) : (
            <ul className="space-y-1">
              {blockedBy.map((dep) => (
                <li
                  key={dep.id}
                  className="flex justify-between items-center p-2 bg-yellow-50 rounded text-sm"
                >
                  <div>
                    <span>{getWorkItemTitle(dep.predecessorId, dep)}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({dep.type} {dep.lagDays > 0 ? `+${dep.lagDays}d` : ''})
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteDependency(dep.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="font-medium mb-2">Blocking</h4>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : blocking.length === 0 ? (
            <p className="text-sm text-gray-500">Not blocking any items</p>
          ) : (
            <ul className="space-y-1">
              {blocking.map((dep) => (
                <li
                  key={dep.id}
                  className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm"
                >
                  <div>
                    <span>{getWorkItemTitle(dep.successorId, dep)}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({dep.type} {dep.lagDays > 0 ? `+${dep.lagDays}d` : ''})
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteDependency(dep.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddDependencyModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          projectId={projectId}
          workItemId={workItem.id}
          onAdded={handleDependencyAdded}
        />
      )}
    </div>
  );
};
