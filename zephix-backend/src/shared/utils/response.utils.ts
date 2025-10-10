import { Project } from '../../modules/projects/entities/project.entity';
import { Workspace } from '../../modules/workspaces/entities/workspace.entity';
import { User } from '../../modules/users/entities/user.entity';

export class ApiResponse {
  /**
   * Standard success response
   */
  static success<T>(data: T, message?: string) {
    return {
      success: true,
      message: message || 'Operation successful',
      data,
    };
  }

  /**
   * Standard error response
   */
  static error(message: string, errors?: any) {
    return {
      success: false,
      message,
      errors,
    };
  }

  /**
   * Serialize Project entity to safe plain object
   */
  static serializeProject(project: Project) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      priority: project.priority,
      riskLevel: project.riskLevel,
      methodology: project.methodology,
      workspaceId: project.workspaceId,
      organizationId: project.organizationId,
      createdById: project.createdById,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  /**
   * Serialize Workspace entity to safe plain object
   */
  static serializeWorkspace(workspace: Workspace) {
    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      organizationId: workspace.organizationId,
      isActive: workspace.isActive,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  /**
   * Serialize User entity to safe plain object (exclude sensitive data)
   */
  static serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationRole: user.organizationRole,
      organizationId: user.organizationId,
      currentWorkspaceId: user.currentWorkspaceId,
      createdAt: user.createdAt,
      // NEVER include: password, refreshToken
    };
  }
}
