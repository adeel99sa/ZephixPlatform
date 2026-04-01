import { Button } from '@/components/ui/Button';
import type { WorkTask } from './types';

interface Props {
  showPanel: boolean;
  deletedTasks: WorkTask[];
  deletedLoading: boolean;
  restoringTaskIds: Set<string>;
  onTogglePanel: () => void;
  onRestore: (taskId: string) => void;
}

export function TaskDeletedPanel({
  showPanel, deletedTasks, deletedLoading, restoringTaskIds,
  onTogglePanel, onRestore,
}: Props) {
  return (
    <div className="mt-6 border-t pt-4">
      <button
        type="button"
        onClick={onTogglePanel}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <span className={`transform transition-transform ${showPanel ? 'rotate-90' : ''}`}>
          &#9654;
        </span>
        <span>Recently deleted</span>
        {deletedTasks.length > 0 && (
          <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
            {deletedTasks.length}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="mt-3 space-y-2">
          {deletedLoading ? (
            <div className="text-sm text-gray-500 py-2">Loading deleted tasks...</div>
          ) : deletedTasks.length === 0 ? (
            <div className="text-sm text-gray-500 py-2">No deleted tasks</div>
          ) : (
            deletedTasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 ${
                  restoringTaskIds.has(task.id) ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 line-through">{task.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Deleted {task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : 'recently'}
                  </div>
                </div>
                <Button
                  onClick={() => onRestore(task.id)}
                  disabled={restoringTaskIds.has(task.id)}
                  className="ml-3 text-sm"
                  variant="ghost"
                >
                  {restoringTaskIds.has(task.id) ? 'Restoring...' : 'Restore'}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}