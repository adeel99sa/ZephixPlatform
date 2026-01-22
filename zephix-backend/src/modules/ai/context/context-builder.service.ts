/**
 * PART 7 Step 19: AI Context Engine
 * Builds structured context object from route and selected entity
 */
import { Injectable } from '@nestjs/common';

export interface AIContext {
  route: string;
  entityType: 'project' | 'task' | 'workspace' | 'program' | 'phase' | null;
  entityId: string | null;
  workspaceId: string | null;
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  entityData: any; // Selected entity data
}

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: string;
  permissions?: string[];
}

@Injectable()
export class AIContextBuilderService {
  /**
   * Build AI context from route, entity, and user context
   * PART 7 Step 19: AI receives page context, role context, entity IDs in scope
   */
  async buildFromRoute(
    route: string,
    entity: any,
    user: AuthContext,
  ): Promise<AIContext> {
    // Extract entity type from route
    const entityType = this.extractEntityType(route);

    // Extract entity ID from route or entity
    const entityId = this.extractEntityId(route, entity);

    // Extract workspace ID from entity or route
    const workspaceId = this.extractWorkspaceId(route, entity);

    // Build permissions array based on role
    const permissions = this.buildPermissions(user.role);

    return {
      route,
      entityType,
      entityId,
      workspaceId,
      organizationId: user.organizationId,
      userId: user.userId,
      userRole: user.role,
      permissions,
      entityData: entity || null,
    };
  }

  /**
   * Extract entity type from route path
   */
  private extractEntityType(route: string): AIContext['entityType'] {
    if (route.includes('/projects/') && !route.includes('/tasks')) {
      return 'project';
    }
    if (route.includes('/tasks/') || route.includes('/work/tasks/')) {
      return 'task';
    }
    if (route.includes('/workspaces/')) {
      return 'workspace';
    }
    if (route.includes('/programs/')) {
      return 'program';
    }
    if (route.includes('/phases/')) {
      return 'phase';
    }
    return null;
  }

  /**
   * Extract entity ID from route or entity object
   */
  private extractEntityId(route: string, entity: any): string | null {
    // Try entity first
    if (entity?.id) {
      return entity.id;
    }

    // Extract from route pattern: /projects/:id, /tasks/:id, etc.
    const patterns = [
      /\/projects\/([a-f0-9-]{36})/i,
      /\/tasks\/([a-f0-9-]{36})/i,
      /\/work\/tasks\/([a-f0-9-]{36})/i,
      /\/workspaces\/([a-f0-9-]{36})/i,
      /\/programs\/([a-f0-9-]{36})/i,
      /\/phases\/([a-f0-9-]{36})/i,
    ];

    for (const pattern of patterns) {
      const match = route.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract workspace ID from entity or route
   */
  private extractWorkspaceId(route: string, entity: any): string | null {
    // Try entity first
    if (entity?.workspaceId) {
      return entity.workspaceId;
    }
    if (entity?.workspace?.id) {
      return entity.workspace.id;
    }

    // Extract from route: /workspaces/:id
    const workspacePattern = /\/workspaces\/([a-f0-9-]{36})/i;
    const match = route.match(workspacePattern);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  }

  /**
   * Build permissions array based on user role
   */
  private buildPermissions(role: string): string[] {
    const permissions: string[] = [];

    // Admin has all permissions
    if (role === 'admin' || role === 'ADMIN') {
      permissions.push('*');
      return permissions;
    }

    // Workspace Owner permissions
    if (role === 'workspace_owner' || role === 'owner') {
      permissions.push('create_project', 'update_project', 'delete_project');
      permissions.push('create_task', 'update_task', 'delete_task');
      permissions.push('manage_members', 'manage_templates');
    }

    // Member permissions
    if (role === 'workspace_member' || role === 'member') {
      permissions.push('create_task', 'update_task', 'comment');
      permissions.push('update_manual_kpi');
    }

    // Viewer permissions (read-only)
    if (role === 'workspace_viewer' || role === 'viewer') {
      permissions.push('read');
    }

    return permissions;
  }
}
