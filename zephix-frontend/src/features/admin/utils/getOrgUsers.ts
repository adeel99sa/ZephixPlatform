/**
 * PROMPT 6: Get organization users helper
 *
 * Filters out Guest users for owner selection
 */
import { listOrgUsers } from '@/features/workspaces/workspace.api';
import { isPlatformAdmin, isPlatformMember } from '@/utils/access';

type OrgUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  platformRole?: string;
};

/**
 * Get organization users, excluding Guests
 * Used for owner selection in workspace creation
 */
export async function getOrgUsers(): Promise<OrgUser[]> {
  try {
    const users = await listOrgUsers();
    // Filter out Guest users - only Admin and Member can be owners
    return users.filter((user: OrgUser) => isPlatformAdmin(user) || isPlatformMember(user));
  } catch (error) {
    console.error('Failed to get org users:', error);
    return [];
  }
}
