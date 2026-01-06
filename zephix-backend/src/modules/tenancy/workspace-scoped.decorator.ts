import 'reflect-metadata';

const WORKSPACE_SCOPED_METADATA_KEY = 'workspace:scoped';

/**
 * Decorator to mark an entity as workspace-scoped.
 * Workspace-scoped entities require workspaceId filter when workspaceId is present in context.
 *
 * Usage:
 * @WorkspaceScoped()
 * @Entity('projects')
 * export class Project { ... }
 */
export function WorkspaceScoped(): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata(WORKSPACE_SCOPED_METADATA_KEY, true, target);
  };
}

/**
 * Check if an entity class is marked as workspace-scoped.
 *
 * @param target - Entity class or entity instance
 * @returns true if entity is workspace-scoped
 */
export function isWorkspaceScoped(target: any): boolean {
  if (!target) {
    return false;
  }

  // Handle both class and instance
  const constructor =
    typeof target === 'function' ? target : target.constructor;

  return (
    Reflect.getMetadata(WORKSPACE_SCOPED_METADATA_KEY, constructor) === true
  );
}

