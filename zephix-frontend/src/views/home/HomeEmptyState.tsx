import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { Button } from '@/components/ui/Button';
import { normalizePlatformRole, PLATFORM_ROLE } from '@/utils/roles';
import { canCreateOrgWorkspace } from '@/utils/access';
import { WorkspaceCreateModal } from '@/features/workspaces/WorkspaceCreateModal';

/**
 * Empty state component for /home when no workspace is selected
 * This component NEVER calls workspace-scoped APIs
 */
export function HomeEmptyState() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const platformRole = user ? normalizePlatformRole(user.platformRole || user.role) : null;
  const isAdmin = platformRole === PLATFORM_ROLE.ADMIN;
  const isPaid = platformRole === PLATFORM_ROLE.ADMIN || platformRole === PLATFORM_ROLE.MEMBER;
  const showCreateWorkspace = canCreateOrgWorkspace(user);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Select a workspace to continue</h1>
          <p className="text-gray-600">
            {isPaid
              ? showCreateWorkspace
                ? 'Select a workspace or create a new one'
                : 'Select a workspace. Ask an org admin if you need a new workspace.'
              : 'Select a workspace to view shared content'}
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/workspaces')} className="px-6 py-3">
            Select Workspace
          </Button>
          {showCreateWorkspace && (
            <Button onClick={() => setShowCreateModal(true)} variant="ghost" className="px-6 py-3">
              Create Workspace
            </Button>
          )}
        </div>
      </div>
      {showCreateModal && (
        <WorkspaceCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
