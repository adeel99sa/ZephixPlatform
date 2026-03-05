/**
 * ROLE MAPPING SUMMARY:
 * - Frontend receives: role = 'ADMIN' | 'MEMBER' | 'VIEWER' (from backend)
 * - Frontend receives: permissions.isAdmin = boolean (from backend)
 * - Frontend admin check: isAdminUser() checks permissions.isAdmin first, then role
 * - normalizePlatformRole() maps: 'admin'/'owner' → 'ADMIN', 'pm'/'member'/'manager' → 'MEMBER', 'viewer' → 'VIEWER'
 *
 * This file is a re-export barrel.
 * The canonical role definitions and utilities live in @/utils/roles.
 * Import from @/utils/roles directly for new code.
 */
export type { PlatformRole, UserRole } from '@/utils/roles';
export {
  PLATFORM_ROLE,
  normalizePlatformRole,
  platformRoleFromUser,
  isAdminRole,
  isAdminUser,
  isPaidUser,
  isGuestUser,
  canManageWorkspaces,
  canCreateProjects,
} from '@/utils/roles';
