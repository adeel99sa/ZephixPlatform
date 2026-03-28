import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { WorkspaceMember } from './workspace-member.entity';

/**
 * Workspace visibility / permissions level.
 * Maps to the isPrivate boolean column in the database:
 *   OPEN   → isPrivate = false (anyone in org can see and join)
 *   CLOSED → isPrivate = true  (anyone in org can see, admins manage access)
 */
export enum WorkspaceVisibility {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

/**
 * PHASE 5.1: LOCKED PRODUCT MODEL - Workspace Access Levels
 *
 * These are INTERNAL workspace access levels. They are NOT exposed as "roles" in UI language.
 * UI should use "access" terminology: Owner, Member, Viewer.
 *
 * Workspace Access Levels (Internal Only):
 * - workspace_owner: Full control over workspace, can manage members
 * - workspace_member: Can create projects and content, cannot manage members
 * - workspace_viewer: Read-only access to workspace content
 *
 * Project-Scoped Roles (MUST REMAIN UNCHANGED):
 * - delivery_owner: Can write within assigned containers (project-scoped, not workspace-scoped)
 * - stakeholder: Read-only access (project-scoped, not workspace-scoped)
 *
 * IMPORTANT:
 * - Project-scoped roles (delivery_owner, stakeholder) are NOT workspace roles
 * - They exist at project level and are invisible unless inside a project
 * - DO NOT migrate or collapse project-scoped roles into workspace roles
 * - These provide granular permissions that Linear and Monday don't have
 */
export type WorkspaceRole =
  | 'workspace_owner'  // Legacy DB value — use workspace_admin in new code
  | 'workspace_admin'  // Canonical alias for workspace_owner (DB still stores workspace_owner)
  | 'workspace_member' // Internal: Workspace Member access
  | 'workspace_viewer' // Internal: Workspace Viewer access
  | 'delivery_owner'   // Project-scoped: DO NOT MIGRATE - remains project-level
  | 'stakeholder';     // Project-scoped: DO NOT MIGRATE - remains project-level

/**
 * Normalize a raw workspace role string.
 * Maps the legacy DB value workspace_owner → canonical workspace_admin.
 * All other values are returned unchanged.
 * Backward compatibility: workspace_owner is still accepted everywhere.
 */
export function normalizeWorkspaceRole(
  role: string | null | undefined,
): WorkspaceRole | null {
  if (!role) return null;
  if (role === 'workspace_owner') return 'workspace_admin';
  const valid: WorkspaceRole[] = [
    'workspace_admin',
    'workspace_member',
    'workspace_viewer',
    'delivery_owner',
    'stakeholder',
  ];
  return valid.includes(role as WorkspaceRole) ? (role as WorkspaceRole) : null;
}

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column('uuid', { name: 'organization_id' }) organizationId!: string;

  @Column({ length: 100 }) name!: string;
  // PROMPT 10: Slug is unique per organization (enforced by unique index)
  @Index('IDX_workspaces_org_slug_unique', ['organizationId', 'slug'], {
    unique: true,
    where: '"slug" IS NOT NULL',
  })
  @Column({ length: 50, nullable: true })
  slug?: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ name: 'is_private', type: 'boolean', default: false })
  isPrivate!: boolean;

  @Column('uuid', { name: 'created_by' }) createdBy!: string;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true }) ownerId?:
    | string
    | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @OneToMany(() => WorkspaceMember, (m) => m.workspace)
  members?: WorkspaceMember[];

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;

  // ✅ First-class soft-delete with TypeORM
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @Column('uuid', { name: 'deleted_by', nullable: true }) deletedBy?:
    | string
    | null;

  // Phase 3: Workspace permissions configuration
  // Stores a JSON matrix defining which roles can perform which actions
  // Example: { "view_workspace": ["owner", "admin", "member", "viewer"], ... }
  @Column({ type: 'jsonb', name: 'permissions_config', nullable: true })
  permissionsConfig?: Record<string, string[]> | null;

  // Phase 3: Default methodology for this workspace
  @Column({
    type: 'varchar',
    length: 50,
    name: 'default_methodology',
    nullable: true,
  })
  defaultMethodology?: string | null;

  @Column({
    type: 'varchar',
    length: 120,
    name: 'business_unit_label',
    nullable: true,
  })
  businessUnitLabel?: string | null;

  @Column({ name: 'default_template_id', type: 'uuid', nullable: true })
  defaultTemplateId?: string | null;

  @Column({
    name: 'inherit_org_default_template',
    type: 'boolean',
    default: true,
  })
  inheritOrgDefaultTemplate!: boolean;

  @Column({
    name: 'governance_inheritance_mode',
    type: 'varchar',
    length: 32,
    default: 'ORG_DEFAULT',
  })
  governanceInheritanceMode!: 'ORG_DEFAULT' | 'WORKSPACE_OVERRIDE';

  @Column({
    name: 'allowed_template_ids',
    type: 'uuid',
    array: true,
    nullable: true,
  })
  allowedTemplateIds?: string[] | null;

  @Column({ name: 'workspace_group_id', type: 'uuid', nullable: true })
  workspaceGroupId?: string | null;

  // PHASE 5.1: Workspace notes for Workspace Home page
  // Stores workspace context, rules, links, expectations
  // Editable only by workspace owner
  @Column({ type: 'text', name: 'home_notes', nullable: true })
  homeNotes?: string | null;
}
