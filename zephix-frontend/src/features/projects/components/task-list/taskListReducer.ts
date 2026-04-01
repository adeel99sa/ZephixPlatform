import type { WorkTaskStatus } from './types';

export type BulkActionType = 'status' | 'assign' | 'dueDate' | 'clearDueDate' | 'unassign' | 'delete' | null;

/** Local UI state managed by the reducer */
export interface TaskListUIState {
  // Create form
  showCreateForm: boolean;
  creating: boolean;

  // Per-task panel toggles
  showComments: Record<string, boolean>;
  showActivity: Record<string, boolean>;
  showDeps: Record<string, boolean>;
  showAC: Record<string, boolean>;

  // Per-task inline input state
  newComment: Record<string, string>;
  postingComment: Record<string, boolean>;
  depSearch: Record<string, string>;
  addingDep: Record<string, boolean>;

  // Selection & bulk actions
  selectedTaskIds: Set<string>;
  bulkAction: BulkActionType;
  bulkStatus: WorkTaskStatus;
  bulkAssigneeId: string;
  bulkDueDate: string;
  bulkProcessing: boolean;

  // Deleted tasks panel
  showDeletedPanel: boolean;
  deletedLoading: boolean;
  restoringTaskIds: Set<string>;
}

export type TaskListAction =
  // Create form
  | { type: 'TOGGLE_CREATE_FORM' }
  | { type: 'SHOW_CREATE_FORM' }
  | { type: 'HIDE_CREATE_FORM' }
  | { type: 'SET_CREATING'; value: boolean }

  // Per-task panel toggles
  | { type: 'TOGGLE_COMMENTS'; taskId: string }
  | { type: 'TOGGLE_ACTIVITY'; taskId: string }
  | { type: 'TOGGLE_DEPS'; taskId: string }
  | { type: 'TOGGLE_AC'; taskId: string }

  // Per-task inline inputs
  | { type: 'SET_NEW_COMMENT'; taskId: string; value: string }
  | { type: 'SET_POSTING_COMMENT'; taskId: string; value: boolean }
  | { type: 'SET_DEP_SEARCH'; taskId: string; value: string }
  | { type: 'SET_ADDING_DEP'; taskId: string; value: boolean }

  // Selection
  | { type: 'TOGGLE_TASK_SELECTION'; taskId: string }
  | { type: 'SELECT_ALL'; taskIds: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'PRUNE_SELECTION'; validIds: string[] }

  // Bulk actions
  | { type: 'SET_BULK_ACTION'; value: BulkActionType }
  | { type: 'SET_BULK_STATUS'; value: WorkTaskStatus }
  | { type: 'SET_BULK_ASSIGNEE_ID'; value: string }
  | { type: 'SET_BULK_DUE_DATE'; value: string }
  | { type: 'SET_BULK_PROCESSING'; value: boolean }
  | { type: 'FINISH_BULK'; clearSelection: boolean }

  // Deleted panel
  | { type: 'TOGGLE_DELETED_PANEL' }
  | { type: 'SET_DELETED_LOADING'; value: boolean }
  | { type: 'ADD_RESTORING'; taskId: string }
  | { type: 'REMOVE_RESTORING'; taskId: string };

export const initialUIState: TaskListUIState = {
  showCreateForm: false,
  creating: false,
  showComments: {},
  showActivity: {},
  showDeps: {},
  showAC: {},
  newComment: {},
  postingComment: {},
  depSearch: {},
  addingDep: {},
  selectedTaskIds: new Set(),
  bulkAction: null,
  bulkStatus: 'TODO' as WorkTaskStatus,
  bulkAssigneeId: '',
  bulkDueDate: '',
  bulkProcessing: false,
  showDeletedPanel: false,
  deletedLoading: false,
  restoringTaskIds: new Set(),
};

export function taskListReducer(state: TaskListUIState, action: TaskListAction): TaskListUIState {
  switch (action.type) {
    // Create form
    case 'TOGGLE_CREATE_FORM':
      return { ...state, showCreateForm: !state.showCreateForm };
    case 'SHOW_CREATE_FORM':
      return { ...state, showCreateForm: true };
    case 'HIDE_CREATE_FORM':
      return { ...state, showCreateForm: false };
    case 'SET_CREATING':
      return { ...state, creating: action.value };

    // Per-task panel toggles
    case 'TOGGLE_COMMENTS':
      return { ...state, showComments: { ...state.showComments, [action.taskId]: !state.showComments[action.taskId] } };
    case 'TOGGLE_ACTIVITY':
      return { ...state, showActivity: { ...state.showActivity, [action.taskId]: !state.showActivity[action.taskId] } };
    case 'TOGGLE_DEPS':
      return { ...state, showDeps: { ...state.showDeps, [action.taskId]: !state.showDeps[action.taskId] } };
    case 'TOGGLE_AC':
      return { ...state, showAC: { ...state.showAC, [action.taskId]: !state.showAC[action.taskId] } };

    // Per-task inline inputs
    case 'SET_NEW_COMMENT':
      return { ...state, newComment: { ...state.newComment, [action.taskId]: action.value } };
    case 'SET_POSTING_COMMENT':
      return { ...state, postingComment: { ...state.postingComment, [action.taskId]: action.value } };
    case 'SET_DEP_SEARCH':
      return { ...state, depSearch: { ...state.depSearch, [action.taskId]: action.value } };
    case 'SET_ADDING_DEP':
      return { ...state, addingDep: { ...state.addingDep, [action.taskId]: action.value } };

    // Selection
    case 'TOGGLE_TASK_SELECTION': {
      const next = new Set(state.selectedTaskIds);
      if (next.has(action.taskId)) next.delete(action.taskId);
      else next.add(action.taskId);
      return { ...state, selectedTaskIds: next };
    }
    case 'SELECT_ALL':
      return { ...state, selectedTaskIds: new Set(action.taskIds) };
    case 'CLEAR_SELECTION':
      return { ...state, selectedTaskIds: new Set(), bulkAction: null };
    case 'PRUNE_SELECTION': {
      const validSet = new Set(action.validIds);
      return { ...state, selectedTaskIds: new Set([...state.selectedTaskIds].filter(id => validSet.has(id))) };
    }

    // Bulk actions
    case 'SET_BULK_ACTION':
      return { ...state, bulkAction: action.value };
    case 'SET_BULK_STATUS':
      return { ...state, bulkStatus: action.value };
    case 'SET_BULK_ASSIGNEE_ID':
      return { ...state, bulkAssigneeId: action.value };
    case 'SET_BULK_DUE_DATE':
      return { ...state, bulkDueDate: action.value };
    case 'SET_BULK_PROCESSING':
      return { ...state, bulkProcessing: action.value };
    case 'FINISH_BULK':
      return {
        ...state,
        bulkProcessing: false,
        ...(action.clearSelection ? { selectedTaskIds: new Set<string>(), bulkAction: null as BulkActionType } : {}),
      };

    // Deleted panel
    case 'TOGGLE_DELETED_PANEL':
      return { ...state, showDeletedPanel: !state.showDeletedPanel };
    case 'SET_DELETED_LOADING':
      return { ...state, deletedLoading: action.value };
    case 'ADD_RESTORING':
      return { ...state, restoringTaskIds: new Set(state.restoringTaskIds).add(action.taskId) };
    case 'REMOVE_RESTORING': {
      const next = new Set(state.restoringTaskIds);
      next.delete(action.taskId);
      return { ...state, restoringTaskIds: next };
    }

    default:
      return state;
  }
}