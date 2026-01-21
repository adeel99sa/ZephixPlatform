/**
 * PART 7 Step 21: AI Execution Flow
 * Registers available actions and supports dry-run preview
 * No autonomous execution - user must confirm
 */
import { Injectable, Logger } from '@nestjs/common';
import { AIContext } from '../context/context-builder.service';

export interface ActionHandler {
  (params: any, context: AIContext): Promise<ActionResult>;
}

export interface ActionPreview {
  action: string;
  description: string;
  changes: string[];
  affectedEntities: string[];
  estimatedImpact?: string;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  auditLogId?: string;
}

export interface ActionDefinition {
  name: string;
  description: string;
  handler: ActionHandler;
  requiresConfirmation: boolean;
}

@Injectable()
export class AIActionRegistryService {
  private readonly logger = new Logger(AIActionRegistryService.name);
  private actions = new Map<string, ActionDefinition>();

  /**
   * Register an action with its handler
   */
  registerAction(
    name: string,
    description: string,
    handler: ActionHandler,
    requiresConfirmation: boolean = true,
  ): void {
    this.actions.set(name, {
      name,
      description,
      handler,
      requiresConfirmation,
    });
    this.logger.log(`Registered AI action: ${name}`);
  }

  /**
   * Preview action without executing
   * PART 7 Step 21: System generates preview, user confirms
   */
  async previewAction(
    action: string,
    params: any,
    context: AIContext,
  ): Promise<ActionPreview> {
    const actionDef = this.actions.get(action);
    if (!actionDef) {
      throw new Error(`Action '${action}' not registered`);
    }

    // Generate preview based on action type
    const preview = this.generatePreview(action, params, context);

    return {
      action,
      description: actionDef.description,
      changes: preview.changes,
      affectedEntities: preview.affectedEntities,
      estimatedImpact: preview.estimatedImpact,
    };
  }

  /**
   * Execute action after user confirmation
   * PART 7 Step 21: System executes, audit log written
   */
  async executeAction(
    action: string,
    params: any,
    context: AIContext,
    confirmed: boolean,
  ): Promise<ActionResult> {
    if (!confirmed) {
      return {
        success: false,
        error: 'Action not confirmed by user',
      };
    }

    const actionDef = this.actions.get(action);
    if (!actionDef) {
      return {
        success: false,
        error: `Action '${action}' not registered`,
      };
    }

    // Require confirmation for actions that need it
    if (actionDef.requiresConfirmation && !confirmed) {
      return {
        success: false,
        error: 'Action requires user confirmation',
      };
    }

    try {
      // Execute handler
      const result = await actionDef.handler(params, context);

      // Write audit log
      const auditLogId = await this.writeAuditLog(
        action,
        params,
        context,
        result,
      );

      return {
        ...result,
        auditLogId,
      };
    } catch (error: any) {
      this.logger.error(`Action execution failed: ${action}`, error);
      return {
        success: false,
        error: error.message || 'Action execution failed',
      };
    }
  }

  /**
   * Get all registered actions
   */
  getRegisteredActions(): string[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Generate preview for action
   */
  private generatePreview(
    action: string,
    params: any,
    context: AIContext,
  ): {
    changes: string[];
    affectedEntities: string[];
    estimatedImpact?: string;
  } {
    const changes: string[] = [];
    const affectedEntities: string[] = [];

    // Add context entity to affected entities
    if (context.entityId && context.entityType) {
      affectedEntities.push(`${context.entityType}:${context.entityId}`);
    }

    // Generate preview based on action type
    switch (action) {
      case 'create_task':
        changes.push(`Create task: ${params.title || 'Untitled'}`);
        if (params.assigneeUserId) {
          changes.push(`Assign to user: ${params.assigneeUserId}`);
        }
        if (context.entityType === 'project') {
          affectedEntities.push(`project:${context.entityId}`);
        }
        break;

      case 'update_task':
        changes.push(`Update task: ${context.entityId}`);
        if (params.status) {
          changes.push(`Change status to: ${params.status}`);
        }
        if (params.assigneeUserId) {
          changes.push(`Reassign to: ${params.assigneeUserId}`);
        }
        break;

      case 'update_project':
        changes.push(`Update project: ${context.entityId}`);
        if (params.status) {
          changes.push(`Change status to: ${params.status}`);
        }
        break;

      case 'create_project':
        changes.push(`Create project: ${params.name || 'Untitled'}`);
        if (context.workspaceId) {
          affectedEntities.push(`workspace:${context.workspaceId}`);
        }
        break;

      default:
        changes.push(`Execute action: ${action}`);
    }

    return {
      changes,
      affectedEntities,
      estimatedImpact: this.estimateImpact(action, params),
    };
  }

  /**
   * Estimate impact of action
   */
  private estimateImpact(action: string, params: any): string {
    if (action.includes('delete')) {
      return 'High - This action cannot be undone';
    }
    if (action.includes('create')) {
      return 'Low - New entity will be created';
    }
    if (action.includes('update')) {
      return 'Medium - Existing entity will be modified';
    }
    return 'Unknown';
  }

  /**
   * Write audit log entry
   * PART 7 Step 21: Audit log entries written for all actions
   */
  private async writeAuditLog(
    action: string,
    params: any,
    context: AIContext,
    result: ActionResult,
  ): Promise<string> {
    // TODO: Integrate with audit log service
    // For now, return a placeholder ID
    const auditLogId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`AI Action Audit: ${action}`, {
      action,
      userId: context.userId,
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
      entityType: context.entityType,
      entityId: context.entityId,
      params,
      success: result.success,
      auditLogId,
    });

    return auditLogId;
  }
}
