export enum UserRole {
  VIEWER = 'viewer',
  MEMBER = 'member', 
  ADMIN = 'admin'
}

export enum Permission {
  READ_USERS = 'users:read',
  WRITE_USERS = 'users:write',
  READ_SECURITY = 'security:read',
  WRITE_SECURITY = 'security:write',
  READ_GOVERNANCE = 'governance:read',
  WRITE_GOVERNANCE = 'governance:write',
  READ_TEMPLATES = 'templates:read',
  WRITE_TEMPLATES = 'templates:write',
  READ_USAGE = 'usage:read',
  EXPORT_AUDIT = 'audit:export'
}

const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.VIEWER]: [
    Permission.READ_USERS,
    Permission.READ_TEMPLATES,
    Permission.READ_USAGE
  ],
  [UserRole.MEMBER]: [
    Permission.READ_USERS,
    Permission.READ_TEMPLATES,
    Permission.WRITE_TEMPLATES,
    Permission.READ_USAGE,
    Permission.READ_GOVERNANCE
  ],
  [UserRole.ADMIN]: Object.values(Permission) // All permissions
};

export class RolePolicy {
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    return rolePermissions[userRole]?.includes(permission) ?? false;
  }
  
  static canAccessRoute(userRole: UserRole, route: string): boolean {
    if (route.startsWith('/admin/security')) {
      return this.hasPermission(userRole, Permission.READ_SECURITY);
    }
    if (route.startsWith('/admin/governance')) {
      return this.hasPermission(userRole, Permission.READ_GOVERNANCE);
    }
    return true; // Default allow for basic routes
  }
  
  static getUIState(userRole: UserRole) {
    return {
      showCreateButtons: userRole !== UserRole.VIEWER,
      showEditButtons: userRole !== UserRole.VIEWER,
      showDeleteButtons: userRole === UserRole.ADMIN,
      showSecurityNav: this.hasPermission(userRole, Permission.READ_SECURITY),
      showContextPanel: userRole !== UserRole.VIEWER
    };
  }
}

