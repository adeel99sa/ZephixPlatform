import { MoreVertical, Trash2 } from 'lucide-react';
import { getAllowedTransitions, type WorkPlanTask, type WorkTaskStatus } from '@/features/work-management/workTasks.api';

interface Props {
  task: WorkPlanTask;
  canWrite: boolean;
  isAdmin: boolean;
  isEditing: boolean;
  editingTitle: string;
  savingTitle: boolean;
  changingStatus: boolean;
  deletingTask: boolean;
  menuOpen: boolean;
  confirmingDelete: boolean;
  onEditTitleChange: (value: string) => void;
  onStartEdit: (task: WorkPlanTask) => void;
  onCancelEdit: () => void;
  onSaveTitle: (taskId: string) => void;
  onStatusChange: (taskId: string, status: WorkTaskStatus) => void;
  onToggleMenu: (taskId: string | null) => void;
  onConfirmDelete: (taskId: string) => void;
}

export function PlanTaskRow({
  task, canWrite, isAdmin, isEditing, editingTitle, savingTitle,
  changingStatus, deletingTask, menuOpen, confirmingDelete,
  onEditTitleChange, onStartEdit, onCancelEdit, onSaveTitle,
  onStatusChange, onToggleMenu, onConfirmDelete,
}: Props) {
  const taskAllowedTransitions = getAllowedTransitions(task.status);

  const statusColorClass =
    task.status === 'DONE' ? 'bg-green-100 text-green-800' :
    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
    task.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
    task.status === 'IN_REVIEW' ? 'bg-purple-100 text-purple-800' :
    'bg-gray-100 text-gray-800';

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              className="text-sm font-medium border border-gray-300 rounded px-2 py-1 flex-1"
              autoFocus
              disabled={savingTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveTitle(task.id);
                if (e.key === 'Escape') onCancelEdit();
              }}
              onBlur={() => onSaveTitle(task.id)}
            />
            {savingTitle && <span className="text-xs text-gray-500">Saving...</span>}
          </div>
        ) : (
          <p
            className={`text-sm font-medium text-gray-900 truncate ${canWrite ? 'cursor-pointer hover:text-blue-600' : ''}`}
            onClick={() => canWrite && onStartEdit(task)}
          >
            {task.title}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1">
          {canWrite && taskAllowedTransitions.length > 0 ? (
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value as WorkTaskStatus)}
              disabled={changingStatus}
              className={`text-xs px-2 py-0.5 rounded border-0 cursor-pointer ${statusColorClass}`}
            >
              <option value={task.status}>{task.status}</option>
              {taskAllowedTransitions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded ${statusColorClass}`}>
              {task.status}
            </span>
          )}

          {task.dueDate && (
            <span className="text-xs text-gray-500">
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {isAdmin && canWrite && (
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleMenu(menuOpen ? null : task.id)}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            disabled={deletingTask}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px]">
              <button
                onClick={() => onConfirmDelete(task.id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete task
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}