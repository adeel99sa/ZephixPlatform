import { AcceptanceCriteriaEditor } from '@/features/work-management/components/AcceptanceCriteriaEditor';
import { TaskCommentPanel } from './TaskCommentPanel';
import { TaskActivityPanel } from './TaskActivityPanel';
import { TaskDependenciesPanel } from './TaskDependenciesPanel';
import { getStatusColor, getStatusLabel } from './utils';
import type { WorkTask, WorkTaskStatus, TaskComment, TaskActivityItem, TaskDependency } from './types';

interface Props {
  task: WorkTask;
  tasks: WorkTask[];
  isHighlighted: boolean;
  isSelected: boolean;
  canEdit: boolean;
  showComments: boolean;
  showActivity: boolean;
  showDeps: boolean;
  showAC: boolean;
  comments: TaskComment[];
  activities: TaskActivityItem[];
  deps: { predecessors: TaskDependency[]; successors: TaskDependency[] } | undefined;
  newComment: string;
  postingComment: boolean;
  depSearch: string;
  addingDep: boolean;
  loading: boolean;
  getUserLabel: (userId?: string | null) => string;
  formatActivity: (activity: TaskActivityItem) => string;
  onStatusChange: (taskId: string, status: WorkTaskStatus) => void;
  onToggleSelection: (taskId: string) => void;
  onToggleComments: (taskId: string) => void;
  onToggleActivity: (taskId: string) => void;
  onToggleDeps: (taskId: string) => void;
  onToggleAC: (taskId: string) => void;
  onNewCommentChange: (taskId: string, value: string) => void;
  onAddComment: (taskId: string) => void;
  onDepSearchChange: (taskId: string, value: string) => void;
  onAddDep: (taskId: string, predecessorTaskId: string) => void;
  onRemoveDep: (taskId: string, predecessorTaskId: string) => void;
  onSaveAC: (taskId: string, items: Array<{ text: string; done: boolean }>) => void;
}

export function TaskRow({
  task, tasks, isHighlighted, isSelected, canEdit, loading,
  showComments, showActivity, showDeps, showAC,
  comments, activities, deps, newComment, postingComment, depSearch, addingDep,
  getUserLabel, formatActivity,
  onStatusChange, onToggleSelection, onToggleComments, onToggleActivity, onToggleDeps, onToggleAC,
  onNewCommentChange, onAddComment, onDepSearchChange, onAddDep, onRemoveDep, onSaveAC,
}: Props) {
  return (
    <div
      data-task-id={task.id}
      className={`border rounded-lg p-4 ${isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50' : ''} ${isSelected ? 'bg-blue-50 border-blue-300' : ''}`}
    >
      <div className="flex items-start justify-between">
        {canEdit && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(task.id)}
            disabled={loading}
            className="mt-1 mr-3 w-4 h-4 rounded border-gray-300"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900">{task.title}</h3>
            {canEdit ? (
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task.id, e.target.value as WorkTaskStatus)}
                className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)} border-0`}
              >
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            ) : (
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                {getStatusLabel(task.status)}
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {task.assigneeUserId && <span>Assigned to: {getUserLabel(task.assigneeUserId)}</span>}
            {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>

      {/* Toggle buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => onToggleAC(task.id)} className="text-xs text-emerald-600 hover:text-emerald-800">
          {showAC ? 'Hide' : 'Show'} Acceptance Criteria ({task.acceptanceCriteria?.length || 0})
        </button>
        <button onClick={() => onToggleComments(task.id)} className="text-xs text-blue-600 hover:text-blue-800">
          {showComments ? 'Hide' : 'Show'} Comments ({comments.length})
        </button>
        <button onClick={() => onToggleActivity(task.id)} className="text-xs text-gray-600 hover:text-gray-800">
          {showActivity ? 'Hide' : 'Show'} Activity
        </button>
        <button onClick={() => onToggleDeps(task.id)} className="text-xs text-indigo-600 hover:text-indigo-800">
          {showDeps ? 'Hide' : 'Show'} Dependencies
        </button>
      </div>

      {/* Inline panels */}
      {showAC && (
        <AcceptanceCriteriaEditor
          items={task.acceptanceCriteria || []}
          onSave={(items) => onSaveAC(task.id, items)}
          readOnly={!canEdit}
        />
      )}
      {showComments && (
        <TaskCommentPanel
          taskId={task.id}
          comments={comments}
          newComment={newComment}
          posting={postingComment}
          canEdit={canEdit}
          getUserLabel={getUserLabel}
          onNewCommentChange={onNewCommentChange}
          onAddComment={onAddComment}
        />
      )}
      {showActivity && (
        <TaskActivityPanel activities={activities} formatActivity={formatActivity} />
      )}
      {showDeps && deps && (
        <TaskDependenciesPanel
          taskId={task.id}
          predecessors={deps.predecessors || []}
          successors={deps.successors || []}
          tasks={tasks}
          depSearch={depSearch}
          addingDep={addingDep}
          canEdit={canEdit}
          onDepSearchChange={onDepSearchChange}
          onAddDep={onAddDep}
          onRemoveDep={onRemoveDep}
        />
      )}
    </div>
  );
}