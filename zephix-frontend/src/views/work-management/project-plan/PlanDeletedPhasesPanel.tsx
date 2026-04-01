import { ChevronDown, ChevronRight, RotateCcw, AlertCircle } from 'lucide-react';
import type { DeletedPhase } from '@/features/work-management/workTasks.api';

interface Props {
  isOpen: boolean;
  deletedPhases: DeletedPhase[];
  loading: boolean;
  error: string | null;
  restoringPhaseIds: Set<string>;
  onToggle: () => void;
  onRestore: (phaseId: string) => void;
}

export function PlanDeletedPhasesPanel({
  isOpen, deletedPhases, loading, error, restoringPhaseIds,
  onToggle, onRestore,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
          <span className="text-sm font-medium text-gray-700">Recently deleted phases</span>
          {deletedPhases.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {deletedPhases.length}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500 py-2">Loading deleted phases...</p>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-red-600 py-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : deletedPhases.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No deleted phases</p>
          ) : (
            deletedPhases.map((phase) => (
              <div
                key={phase.id}
                className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 ${
                  restoringPhaseIds.has(phase.id) ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700 line-through">{phase.name}</span>
                  {phase.deletedAt && (
                    <span className="ml-2 text-xs text-gray-500">
                      Deleted {new Date(phase.deletedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onRestore(phase.id)}
                  disabled={restoringPhaseIds.has(phase.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  {restoringPhaseIds.has(phase.id) ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}