/**
 * PART 7 Step 20: AI Permissions
 * Validates if user can perform action based on role + page context
 */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { AIContext } from '../context/context-builder.service';

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: string;
}

/**
 * Policy matrix defining allowed actions by role and page
 * PART 7 Step 20: Admin can request actions across workspace, Member only on assigned work, Guest only questions
 */
const POLICY_MATRIX: Record<string, Record<string, string[]>> = {
  admin: {
    '*': ['*'], // Admin can do everything
  },
  workspace_owner: {
    '/workspaces/:id': [
      'create_project',
      'update_workspace',
      'manage_members',
      'manage_templates',
    ],
    '/projects/:id': [
      'update_project',
      'create_task',
      'update_task',
      'delete_task',
      'manage_kpis',
      'manage_members',
    ],
    '/programs/:id': ['update_program', 'manage_projects'],
  },
  workspace_member: {
    '/projects/:id': [
      'create_task',
      'update_task',
      'comment',
      'update_manual_kpi',
    ],
    '/tasks/:id': ['update_task', 'comment', 'update_status'],
    '/my-work': ['update_task', 'comment'],
  },
  workspace_viewer: {
    '*': ['read'], // Viewer can only read
  },
};

@Injectable()
export class AIPolicyMatrixService {
  /**
   * Check if user can perform action in given context
   * PART 7 Step 20: Permission validation by role + page
   */
  canPerformAction(
    action: string,
    role: string,
    context: AIContext,
  ): PolicyResult {
    // Normalize role
    const normalizedRole = this.normalizeRole(role);

    // Admin can do everything
    if (normalizedRole === 'admin') {
      return { allowed: true };
    }

    // Get policy for role
    const rolePolicy = POLICY_MATRIX[normalizedRole];
    if (!rolePolicy) {
      return {
        allowed: false,
        reason: `Unknown role: ${normalizedRole}`,
      };
    }

    // Check if role has wildcard permission
    if (rolePolicy['*']?.includes('*')) {
      return { allowed: true };
    }

    // Check route-specific permissions
    const route = this.normalizeRoute(context.route);
    const routePolicy = rolePolicy[route] || rolePolicy['*'];

    if (!routePolicy) {
      return {
        allowed: false,
        reason: `No permissions defined for route: ${route}`,
        requiredRole: 'workspace_owner',
      };
    }

    // Check if action is allowed
    const isAllowed = routePolicy.includes('*') || routePolicy.includes(action);

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Action '${action}' not allowed for role '${normalizedRole}' on route '${route}'`,
        requiredRole: this.getRequiredRoleForAction(action),
      };
    }

    // Special check: Members can only modify assigned work
    if (normalizedRole === 'workspace_member') {
      const canModify = this.canMemberModifyEntity(action, context);
      if (!canModify.allowed) {
        return canModify;
      }
    }

    return { allowed: true };
  }

  /**
   * Get all allowed actions for role in context
   */
  getAllowedActions(role: string, context: AIContext): string[] {
    const normalizedRole = this.normalizeRole(role);
    const rolePolicy = POLICY_MATRIX[normalizedRole];
    if (!rolePolicy) {
      return [];
    }

    // Admin gets all actions
    if (normalizedRole === 'admin' && rolePolicy['*']?.includes('*')) {
      return ['*'];
    }

    // Get route-specific actions
    const route = this.normalizeRoute(context.route);
    return rolePolicy[route] || rolePolicy['*'] || [];
  }

  /**
   * Normalize role name
   */
  private normalizeRole(role: string): string {
    const roleMap: Record<string, string> = {
      admin: 'admin',
      ADMIN: 'admin',
      owner: 'workspace_owner',
      workspace_owner: 'workspace_owner',
      member: 'workspace_member',
      workspace_member: 'workspace_member',
      viewer: 'workspace_viewer',
      workspace_viewer: 'workspace_viewer',
      guest: 'workspace_viewer',
    };

    return roleMap[role] || role.toLowerCase();
  }

  /**
   * Normalize route to policy key
   */
  private normalizeRoute(route: string): string {
    // Convert /projects/123 to /projects/:id
    return route
      .replace(/\/[a-f0-9-]{36}/gi, '/:id')
      .replace(/\/work\/tasks/, '/tasks')
      .split('?')[0]; // Remove query params
  }

  /**
   * Check if member can modify entity (must be assigned)
   * PART 7 Step 20: Member can request actions only on assigned work
   */
  private canMemberModifyEntity(
    action: string,
    context: AIContext,
  ): PolicyResult {
    // Read actions are always allowed
    if (action === 'read' || action.startsWith('get_')) {
      return { allowed: true };
    }

    // For task modifications, check if member is assignee
    if (context.entityType === 'task' && context.entityData) {
      const task = context.entityData;
      if (task.assigneeUserId !== context.userId) {
        return {
          allowed: false,
          reason: 'You can only modify tasks assigned to you',
        };
      }
    }

    // For other entities, members can create but not modify others' work
    if (action.startsWith('create_')) {
      return { allowed: true };
    }

    // Default: allow if entity belongs to user's workspace
    return { allowed: true };
  }

  /**
   * Get required role for action
   */
  private getRequiredRoleForAction(action: string): string {
    if (action.includes('delete') || action.includes('manage')) {
      return 'workspace_owner';
    }
    if (action.includes('update') || action.includes('create')) {
      return 'workspace_member';
    }
    return 'workspace_viewer';
  }
}
