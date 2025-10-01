import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from './workspace.entity';

export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export interface WorkspacePermissions {
  // Project permissions
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canViewAllProjects: boolean;
  
  // Task permissions
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canAssignTasks: boolean;
  
  // Team permissions
  canCreateTeams: boolean;
  canEditTeams: boolean;
  canDeleteTeams: boolean;
  canManageTeamMembers: boolean;
  
  // Resource permissions
  canViewResources: boolean;
  canEditResources: boolean;
  canAllocateResources: boolean;
  
  // Workspace permissions
  canInviteUsers: boolean;
  canRemoveUsers: boolean;
  canManageWorkspace: boolean;
  canViewAnalytics: boolean;
}

@Entity('user_workspace_roles')
@Index(['userId'])
@Index(['workspaceId'])
@Index(['isActive'])
@Index(['role'])
export class UserWorkspaceRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({
    type: 'enum',
    enum: WorkspaceRole,
    default: WorkspaceRole.MEMBER,
  })
  role: WorkspaceRole;

  @Column({ type: 'jsonb', default: {} })
  permissions: WorkspacePermissions;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'joined_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({ name: 'last_access_at', type: 'timestamp', nullable: true })
  lastAccessAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  // Helper methods
  isOwner(): boolean {
    return this.role === WorkspaceRole.OWNER;
  }

  isAdmin(): boolean {
    return this.role === WorkspaceRole.ADMIN;
  }

  isMember(): boolean {
    return this.role === WorkspaceRole.MEMBER;
  }

  isViewer(): boolean {
    return this.role === WorkspaceRole.VIEWER;
  }

  canManageWorkspace(): boolean {
    return [WorkspaceRole.OWNER, WorkspaceRole.ADMIN].includes(this.role);
  }

  canInviteUsers(): boolean {
    return this.permissions?.canInviteUsers || this.canManageWorkspace();
  }

  canCreateProjects(): boolean {
    return this.permissions?.canCreateProjects || this.canManageWorkspace();
  }

  canEditProjects(): boolean {
    return this.permissions?.canEditProjects || this.canManageWorkspace();
  }

  canDeleteProjects(): boolean {
    return this.permissions?.canDeleteProjects || this.canManageWorkspace();
  }

  canCreateTasks(): boolean {
    return this.permissions?.canCreateTasks || this.isMember() || this.canManageWorkspace();
  }

  canEditTasks(): boolean {
    return this.permissions?.canEditTasks || this.isMember() || this.canManageWorkspace();
  }

  canAssignTasks(): boolean {
    return this.permissions?.canAssignTasks || this.isMember() || this.canManageWorkspace();
  }

  canDeleteTasks(): boolean {
    return this.permissions?.canDeleteTasks || this.canManageWorkspace();
  }

  canCreateTeams(): boolean {
    return this.permissions?.canCreateTeams || this.canManageWorkspace();
  }

  canEditTeams(): boolean {
    return this.permissions?.canEditTeams || this.canManageWorkspace();
  }

  canDeleteTeams(): boolean {
    return this.permissions?.canDeleteTeams || this.canManageWorkspace();
  }

  canManageTeamMembers(): boolean {
    return this.permissions?.canManageTeamMembers || this.canManageWorkspace();
  }

  canViewResources(): boolean {
    return this.permissions?.canViewResources || this.isMember() || this.canManageWorkspace();
  }

  canEditResources(): boolean {
    return this.permissions?.canEditResources || this.canManageWorkspace();
  }

  canRemoveUsers(): boolean {
    return this.permissions?.canRemoveUsers || this.canManageWorkspace();
  }

  canManageTeams(): boolean {
    return this.permissions?.canCreateTeams || this.canManageWorkspace();
  }

  canAllocateResources(): boolean {
    return this.permissions?.canAllocateResources || this.canManageWorkspace();
  }

  canViewAnalytics(): boolean {
    return this.permissions?.canViewAnalytics || this.canManageWorkspace();
  }

  // Update last access
  updateLastAccess(): void {
    this.lastAccessAt = new Date();
  }

  // Get default permissions based on role
  static getDefaultPermissions(role: WorkspaceRole): WorkspacePermissions {
    switch (role) {
      case WorkspaceRole.OWNER:
        return {
          canCreateProjects: true,
          canEditProjects: true,
          canDeleteProjects: true,
          canViewAllProjects: true,
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canAssignTasks: true,
          canCreateTeams: true,
          canEditTeams: true,
          canDeleteTeams: true,
          canManageTeamMembers: true,
          canViewResources: true,
          canEditResources: true,
          canAllocateResources: true,
          canInviteUsers: true,
          canRemoveUsers: true,
          canManageWorkspace: true,
          canViewAnalytics: true,
        };
      case WorkspaceRole.ADMIN:
        return {
          canCreateProjects: true,
          canEditProjects: true,
          canDeleteProjects: true,
          canViewAllProjects: true,
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canAssignTasks: true,
          canCreateTeams: true,
          canEditTeams: true,
          canDeleteTeams: true,
          canManageTeamMembers: true,
          canViewResources: true,
          canEditResources: true,
          canAllocateResources: true,
          canInviteUsers: true,
          canRemoveUsers: true,
          canManageWorkspace: true,
          canViewAnalytics: true,
        };
      case WorkspaceRole.MEMBER:
        return {
          canCreateProjects: true,
          canEditProjects: true,
          canDeleteProjects: false,
          canViewAllProjects: true,
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: false,
          canAssignTasks: true,
          canCreateTeams: false,
          canEditTeams: false,
          canDeleteTeams: false,
          canManageTeamMembers: false,
          canViewResources: true,
          canEditResources: false,
          canAllocateResources: false,
          canInviteUsers: false,
          canRemoveUsers: false,
          canManageWorkspace: false,
          canViewAnalytics: false,
        };
      case WorkspaceRole.VIEWER:
        return {
          canCreateProjects: false,
          canEditProjects: false,
          canDeleteProjects: false,
          canViewAllProjects: true,
          canCreateTasks: false,
          canEditTasks: false,
          canDeleteTasks: false,
          canAssignTasks: false,
          canCreateTeams: false,
          canEditTeams: false,
          canDeleteTeams: false,
          canManageTeamMembers: false,
          canViewResources: true,
          canEditResources: false,
          canAllocateResources: false,
          canInviteUsers: false,
          canRemoveUsers: false,
          canManageWorkspace: false,
          canViewAnalytics: false,
        };
      default:
        return {
          canCreateProjects: false,
          canEditProjects: false,
          canDeleteProjects: false,
          canViewAllProjects: false,
          canCreateTasks: false,
          canEditTasks: false,
          canDeleteTasks: false,
          canAssignTasks: false,
          canCreateTeams: false,
          canEditTeams: false,
          canDeleteTeams: false,
          canManageTeamMembers: false,
          canViewResources: false,
          canEditResources: false,
          canAllocateResources: false,
          canInviteUsers: false,
          canRemoveUsers: false,
          canManageWorkspace: false,
          canViewAnalytics: false,
        };
    }
  }
}
