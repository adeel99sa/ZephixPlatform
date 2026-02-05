/**
 * DEPRECATED — Work Items module has been fully migrated to work-management.
 * These exports exist only to break builds loudly if any code still imports them.
 *
 * For tasks: use @/features/work-management/workTasks.api
 * For stats: use @/features/work-management/workTasks.stats.api
 */

export function listWorkItems(): never {
  throw new Error('DEPRECATED: use workTasks.api listTasks');
}

export function listWorkItemsByProject(): never {
  throw new Error('DEPRECATED: use workTasks.api listTasks with projectId');
}

export function createWorkItem(): never {
  throw new Error('DEPRECATED: use workTasks.api createTask');
}

export function getWorkItem(): never {
  throw new Error('DEPRECATED: use workTasks.api getTask');
}

export function updateWorkItem(): never {
  throw new Error('DEPRECATED: use workTasks.api updateTask');
}

export function updateWorkItemStatus(): never {
  throw new Error('DEPRECATED: use workTasks.api updateTask with status');
}

export function deleteWorkItem(): never {
  throw new Error('DEPRECATED: use workTasks.api deleteTask');
}

export function restoreWorkItem(): never {
  throw new Error('DEPRECATED: use workTasks.api (soft delete recovery not supported)');
}

export function getCompletionRatioByProject(): never {
  throw new Error('DEPRECATED: use workTasks.stats.api getProjectCompletionStats');
}

export function getCompletionRatioByWorkspace(): never {
  throw new Error('DEPRECATED: use workTasks.stats.api getWorkspaceCompletionStats');
}
