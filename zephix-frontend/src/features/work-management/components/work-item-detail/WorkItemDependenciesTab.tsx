import { GitBranch, ArrowRight, X } from 'lucide-react';
import type { TaskDetailDto } from '../../api/taskDetail.api';
import type { WorkTask as WorkTaskItem, DependencyType } from '../../workTasks.api';

interface Props {
  detail: TaskDetailDto;
  canEditWork: boolean;
  showAddDep: boolean;
  depSearch: string;
  depSearchResults: WorkTaskItem[];
  depType: DependencyType;
  addingDep: boolean;
  onToggleAddDep: (show: boolean) => void;
  onDepSearchChange: (value: string) => void;
  onDepTypeChange: (type: DependencyType) => void;
  onAddDependency: (predecessorId: string) => void;
  onRemoveDependency: (predecessorId: string, type?: DependencyType) => void;
  onClearSearch: () => void;
  onClose: () => void;
}

export function WorkItemDependenciesTab({
  detail, canEditWork, showAddDep, depSearch, depSearchResults, depType, addingDep,
  onToggleAddDep, onDepSearchChange, onDepTypeChange, onAddDependency, onRemoveDependency, onClearSearch, onClose,
}: Props) {
  const depsCount = detail.dependencies.blockedBy.length + detail.dependencies.blocking.length;

  return (
    <div className="p-4 space-y-4">
      {canEditWork && (
        <div>
          {showAddDep ? (
            <div className="border border-indigo-200 rounded-lg p-3 space-y-2 bg-indigo-50/30">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={depSearch}
                  onChange={(e) => onDepSearchChange(e.target.value)}
                  placeholder="Search tasks to add as dependency..."
                  className="flex-1 text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  autoFocus
                />
                <select
                  value={depType}
                  onChange={(e) => onDepTypeChange(e.target.value as DependencyType)}
                  className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
                >
                  <option value="FINISH_TO_START">Finish to Start</option>
                  <option value="START_TO_START">Start to Start</option>
                  <option value="FINISH_TO_FINISH">Finish to Finish</option>
                  <option value="START_TO_FINISH">Start to Finish</option>
                </select>
                <button onClick={onClearSearch} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
              {depSearchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {depSearchResults.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onAddDependency(t.id)}
                      disabled={addingDep}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-indigo-100 text-sm"
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${t.status === 'DONE' ? 'bg-green-500' : t.status === 'BLOCKED' ? 'bg-red-500' : 'bg-gray-400'}`} />
                      <span className="truncate">{t.title}</span>
                      <span className="ml-auto text-[10px] text-gray-400">{t.status}</span>
                    </button>
                  ))}
                </div>
              )}
              {depSearch.trim() && depSearchResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No matching tasks</p>
              )}
            </div>
          ) : (
            <button onClick={() => onToggleAddDep(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              + Add Dependency
            </button>
          )}
        </div>
      )}

      {depsCount === 0 && !showAddDep ? (
        <div className="text-center py-8">
          <GitBranch className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No dependencies</p>
          <p className="text-xs text-gray-300 mt-1">Add dependencies to track blockers</p>
        </div>
      ) : (
        <>
          {detail.dependencies.blockedBy.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-600 uppercase mb-2">Blocked By ({detail.dependencies.blockedBy.length})</h4>
              <div className="space-y-1">
                {detail.dependencies.blockedBy.map((dep) => (
                  <div key={dep.id} className="group flex items-center gap-2 rounded border border-red-100 bg-red-50 p-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                    <span
                      className="text-gray-800 truncate flex-1 cursor-pointer hover:text-indigo-600"
                      onClick={() => {
                        onClose();
                        setTimeout(() => { window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId: dep.predecessorTaskId } })); }, 100);
                      }}
                    >
                      {dep.predecessorTaskId.slice(0, 8)}... <span className="text-[10px] text-gray-400">{dep.type}</span>
                    </span>
                    {canEditWork && (
                      <button
                        onClick={() => onRemoveDependency(dep.predecessorTaskId, dep.type as DependencyType)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                        title="Remove dependency"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {detail.dependencies.blocking.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-orange-600 uppercase mb-2">Blocking ({detail.dependencies.blocking.length})</h4>
              <div className="space-y-1">
                {detail.dependencies.blocking.map((dep) => (
                  <div key={dep.id} className="group flex items-center gap-2 rounded border border-orange-100 bg-orange-50 p-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-orange-400 shrink-0" />
                    <span
                      className="text-gray-800 truncate flex-1 cursor-pointer hover:text-indigo-600"
                      onClick={() => {
                        onClose();
                        setTimeout(() => { window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId: dep.successorTaskId } })); }, 100);
                      }}
                    >
                      {dep.successorTaskId.slice(0, 8)}... <span className="text-[10px] text-gray-400">{dep.type}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}