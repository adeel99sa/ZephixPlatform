import type { TaskDependency, WorkTask } from './types';

interface Props {
  taskId: string;
  predecessors: TaskDependency[];
  successors: TaskDependency[];
  tasks: WorkTask[];
  depSearch: string;
  addingDep: boolean;
  canEdit: boolean;
  onDepSearchChange: (taskId: string, value: string) => void;
  onAddDep: (taskId: string, predecessorTaskId: string) => void;
  onRemoveDep: (taskId: string, predecessorTaskId: string) => void;
}

export function TaskDependenciesPanel({
  taskId, predecessors, successors, tasks, depSearch, addingDep, canEdit,
  onDepSearchChange, onAddDep, onRemoveDep,
}: Props) {
  return (
    <div className="mt-3 pt-3 border-t">
      <h4 className="text-sm font-medium mb-2">Dependencies</h4>
      {/* Blocked by (predecessors) */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 mb-1">Blocked by</p>
        {predecessors.length ? (
          <div className="space-y-1">
            {predecessors.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between text-sm bg-red-50 p-2 rounded">
                <span className="text-gray-700">{dep.predecessorTitle || dep.predecessorTaskId}</span>
                {canEdit && (
                  <button onClick={() => onRemoveDep(taskId, dep.predecessorTaskId)} className="text-xs text-red-600 hover:text-red-800">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">None</p>
        )}
      </div>
      {/* Blocking (successors) */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 mb-1">Blocking</p>
        {successors.length ? (
          <div className="space-y-1">
            {successors.map((dep) => (
              <div key={dep.id} className="flex items-center text-sm bg-amber-50 p-2 rounded">
                <span className="text-gray-700">{dep.successorTitle || dep.successorTaskId}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">None</p>
        )}
      </div>
      {/* Add dependency */}
      {canEdit && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Add "blocked by" dependency</p>
          <div className="flex gap-2">
            <select
              value={depSearch}
              onChange={(e) => onDepSearchChange(taskId, e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Select a task...</option>
              {tasks
                .filter(t => t.id !== taskId && !t.deletedAt)
                .map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button
              onClick={() => depSearch && onAddDep(taskId, depSearch)}
              disabled={!depSearch || addingDep}
              className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {addingDep ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}