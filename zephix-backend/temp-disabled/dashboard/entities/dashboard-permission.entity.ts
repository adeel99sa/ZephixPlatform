import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsBoolean, IsEnum, IsArray, IsObject } from 'class-validator';
import { Dashboard } from './dashboard.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum PermissionLevel {
  VIEW = 'view',
  EDIT = 'edit',
  ADMIN = 'admin',
  OWNER = 'owner',
}

export enum PermissionScope {
  USER = 'user',
  ROLE = 'role',
  TEAM = 'team',
  ORGANIZATION = 'organization',
}

@Entity('dashboard_permissions')
@Index(['dashboardId', 'userId'])
@Index(['dashboardId', 'role'])
@Index(['dashboardId', 'teamId'])
@Index(['dashboardId', 'organizationId'])
export class DashboardPermission {
  @ApiProperty({ description: 'Unique identifier for the permission' })
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Dashboard ID' })
  @Column({ type: 'uuid' })
  @IsUUID()
  dashboardId: string;

  @ApiProperty({ description: 'Permission level' })
  @Column({
    type: 'enum',
    enum: PermissionLevel,
    default: PermissionLevel.VIEW,
  })
  @IsEnum(PermissionLevel)
  level: PermissionLevel;

  @ApiProperty({ description: 'Permission scope' })
  @Column({
    type: 'enum',
    enum: PermissionScope,
    default: PermissionScope.USER,
  })
  @IsEnum(PermissionScope)
  scope: PermissionScope;

  @ApiProperty({ description: 'User ID (for user-specific permissions)' })
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Role name (for role-based permissions)' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Team ID (for team-based permissions)' })
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiProperty({ description: 'Organization ID (for org-wide permissions)' })
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: 'Specific permissions' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canExport: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
  };

  @ApiProperty({ description: 'Permission metadata' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Permission tags' })
  @Column({ type: 'text', array: true, default: [] })
  @IsArray()
  tags: string[];

  @ApiProperty({ description: 'Whether permission is active' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Permission expiration date' })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @ApiProperty({ description: 'Granted by user ID' })
  @Column({ type: 'uuid' })
  @IsUUID()
  grantedById: string;

  @ApiProperty({ description: 'Granted timestamp' })
  @CreateDateColumn()
  grantedAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'Soft delete timestamp' })
  @DeleteDateColumn()
  deletedAt?: Date;

  // Relationships
  @ManyToOne(() => Dashboard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboardId' })
  dashboard: Dashboard;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'grantedById' })
  grantedBy: User;
}
