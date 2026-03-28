/**
 * RE-EXPORT SHIM — do not add logic here.
 *
 * The canonical source of truth for platform roles is:
 *   src/common/auth/platform-roles.ts
 *
 * This file exists for backward compatibility: ~45 backend modules import from
 * this path. All exports are forwarded to the canonical module so there is one
 * implementation, not two.
 *
 * New code should import directly from `../../common/auth/platform-roles`
 * (adjust relative path as needed).
 */
export {
  PlatformRole,
  LEGACY_ROLE_MAPPING,
  normalizePlatformRole,
  isAdminRole,
  isAdminPlatformRole,
  isMemberPlatformRole,
  isViewerPlatformRole,
  resolvePlatformRoleFromRequestUser,
  canCreateWorkspaces,
} from '../../common/auth/platform-roles';
