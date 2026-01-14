import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { normalizePlatformRole, PLATFORM_ROLE } from '@/utils/roles';
import { AdminHome } from './home/AdminHome';
import { MemberHome } from './home/MemberHome';
import { GuestHome } from './home/GuestHome';

export const HomeView: React.FC = () => {
  const { user, activeWorkspaceId } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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
