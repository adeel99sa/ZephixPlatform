import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { normalizePlatformRole, PLATFORM_ROLE } from '@/utils/roles';
import { AdminHome } from './home/AdminHome';
import { MemberHome } from './home/MemberHome';
import { GuestHome } from './home/GuestHome';
import { HomeEmptyState } from './home/HomeEmptyState';

export const HomeView: React.FC = () => {
  const { user } = useAuth();
  // STEP A: Read activeWorkspaceId from workspace store FIRST
  const { activeWorkspaceId } = useWorkspaceStore();

  if (!user) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // STEP A: Guard must be FIRST return after user check
  // If null, return HomeEmptyState immediately - prevents ANY workspace-scoped API calls
  if (!activeWorkspaceId) {
    return <HomeEmptyState />;
  }

  // STEP A: Only after guard passes, render role-based home components

  // PHASE 5.3: Route by platform role
  // Fix 4: Use platformRole first (source of truth), fallback to role only if missing
  const platformRole = normalizePlatformRole(user.platformRole || user.role);

  // Fix 4: Use PlatformRole constants instead of string literals to prevent drift and typos
  if (platformRole === PLATFORM_ROLE.ADMIN) {
    return <AdminHome />;
  } else if (platformRole === PLATFORM_ROLE.MEMBER) {
    return <MemberHome />;
  } else {
    // VIEWER (Guest)
    return <GuestHome />;
  }
};
