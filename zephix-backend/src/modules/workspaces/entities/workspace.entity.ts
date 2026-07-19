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
 * AD-026 / B2: Workspace complexity tier.
 *
 * Controls which capabilities are available in the workspace.
 *   LEAN     → lightweight task tracking, no governance overhead
 *   STANDARD → project management with phases, risks, budgets
 *   GOVERNED → full governance, phase gates, compliance workflows;
 *              prerequisite for Programs (ADR-B2-003).
 *
 * B2 PR1 is **additive**: legacy values SIMPLE and ADVANCED remain in the
 * enum for the duration of the three-stage rename (ADR-B2-001). Stage 2
 * (PR2, migration 18000000000170) backfills row data simple→lean and
 * advanced→governed. Stage 3 (PR3, migration 18000000000180) drops
 * SIMPLE/ADVANCED via column type swap.
 *
 * Do not introduce new code paths that *write* SIMPLE or ADVANCED. Read
 * paths must continue to tolerate these values until Stage 3 completes.
 */
export enum WorkspaceComplexityMode {
  /** B2 — preferred lightweight tier. */
  LEAN = 'lean',
  /** B2 — preferred mid tier (unchanged from AD-026). */
  STANDARD = 'standard',
  /** B2 — preferred governed tier; gates Programs (ADR-B2-003). */
  GOVERNED = 'governed',
  /** @deprecated B2 PR3 will remove. Backfilled to LEAN in PR2. */
  SIMPLE = 'simple',
  /** @deprecated B2 PR3 will remove. Backfilled to GOVERNED in PR2. */
  ADVANCED = 'advanced',
}

/**
 * The three values accepted by B2 HTTP endpoints (PR2). Internal services
 * may still encounter SIMPLE/ADVANCED on read until Stage 3 completes;
 * inbound DTO validation is restricted to this triplet.
 */
export const WORKSPACE_COMPLEXITY_MODE_B2_VALUES = [
  WorkspaceComplexityMode.LEAN,
  WorkspaceComplexityMode.STANDARD,
  WorkspaceComplexityMode.GOVERNED,
] as const;
export type WorkspaceComplexityModeB2 =
  (typeof WORKSPACE_COMPLEXITY_MODE_B2_VALUES)[number];

/**
 * SOD-PORT-1: single source of truth for whether a workspace's complexity mode
 * PERMITS self-approval (requester === approver/resolver).
 *
 * - GOVERNED (and deprecated ADVANCED, backfilled to GOVERNED) → BLOCKED. Full
 *   separation of duties; identical behaviour to the historical unconditional
 *   gate ban.
 * - LEAN / STANDARD (and deprecated SIMPLE, backfilled to LEAN) → PERMITTED, but
 *   the receipt MUST record that it was self-approved (no implied peer review).
 *
 * Fail closed on any unknown value: default to BLOCKED rather than silently
 * allowing self-approval.
 */
export function selfApprovalAllowedForMode(
  mode: WorkspaceComplexityMode | string | null | undefined,
): boolean {
  switch (mode) {
    case WorkspaceComplexityMode.LEAN:
    case WorkspaceComplexityMode.STANDARD:
    case WorkspaceComplexityMode.SIMPLE:
      return true;
    case WorkspaceComplexityMode.GOVERNED:
    case WorkspaceComplexityMode.ADVANCED:
      return false;
    default:
      // Unknown/missing mode → fail closed (blocked), never silently permit.
      return false;
  }
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
  | 'workspace_owner'  // Canonical workspace owner role
  | 'workspace_member' // Internal: Workspace Member access
  | 'workspace_viewer' // Internal: Workspace Viewer access
  // WA-1 DEPRECATED (vestigial as WORKSPACE roles): 'delivery_owner' and
  // 'stakeholder' are UNASSIGNABLE at workspace level — AddMemberDto rejects
  // them and WorkspaceMembersService throws on them. No workspace_members rows
  // carry these values (verified on staging). They remain in the union only so
  // legacy references compile; do not add them to any write allowlist. The
  // real "Project Lead" is projects.delivery_owner_user_id, a DIFFERENT store
  // that stays. Full removal from the union is a code-reference refactor (no DB
  // migration needed — workspace_members.role is a plain text column with no
  // CHECK constraint); tracked as a follow-up, NOT done here.
  | 'delivery_owner'   // @deprecated WA-1 — vestigial workspace role; see note above
  | 'stakeholder';     // @deprecated WA-1 — vestigial workspace role; see note above

/**
 * Normalize a raw workspace role string.
 * Returns workspace role when it matches the canonical role set.
 */
export function normalizeWorkspaceRole(
  role: string | null | undefined,
): WorkspaceRole | null {
  if (!role) return null;
  const valid: WorkspaceRole[] = [
    'workspace_owner',
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

  // AD-026 / B2: Workspace complexity tier.
  // PR1 (this commit) keeps the legacy default 'simple' so existing rows
  // and Stage-1 column-default semantics are preserved. PR2 migration
  // 18000000000170 flips the DB DEFAULT to 'lean' and backfills existing
  // rows. The reference to a @deprecated enum member here is intentional
  // and constrained to PR1 — see ADR-B2-001.
  @Column({
    type: 'enum',
    enum: WorkspaceComplexityMode,
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- PR1 only; PR2 flips to LEAN
    default: WorkspaceComplexityMode.SIMPLE,
    name: 'complexity_mode',
  })
  complexityMode!: WorkspaceComplexityMode;

  // PHASE 5.1: Workspace notes for Workspace Home page
  // Stores workspace context, rules, links, expectations
  // Editable only by workspace owner
  @Column({ type: 'text', name: 'home_notes', nullable: true })
  homeNotes?: string | null;

  // Pass 2.5 + Pass 4: Workspace dashboard configuration
  // Stores added insight card IDs + layout (order, size)
  // Shape: { addedCards: string[], layout?: Array<{ cardId, colSpan, order }> }
  @Column({
    type: 'jsonb',
    name: 'dashboard_config',
    nullable: true,
    default: () => "'{}'::jsonb",
  })
  dashboardConfig?: {
    addedCards?: string[];
    layout?: Array<{ cardId: string; colSpan: number; order: number }>;
  } | null;
}
