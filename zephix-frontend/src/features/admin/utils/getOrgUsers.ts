/**
 * PROMPT 6: Get organization users helper
 *
 * Filters out Guest users for owner selection
 */
import { listOrgUsers } from '@/features/workspaces/workspace.api';
import { normalizePlatformRole } from '@/types/roles';
import type { PlatformRole } from '@/types/roles';

type OrgUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

/**
 * Get organization users, excluding Guests
 * Used for owner selection in workspace creation
 */
export async function getOrgUsers(): Promise<OrgUser[]> {
  try {
    const users = await listOrgUsers();
    // Filter out Guest users - only Admin and Member can be owners
    return users.filter((user: OrgUser) => {
      const platformRole = normalizePlatformRole(user.role);
      return platformRole === 'ADMIN' || platformRole === 'MEMBER';
    });
  } catch (error) {
    console.error('Failed to get org users:', error);
    return [];
  }
}
