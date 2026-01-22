import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import { useWorkspaceRole } from './useWorkspaceRole';

/**
 * Phase 5.1: Redirect delivery_owner/workspace_owner to /templates
 * if workspace has zero ACTIVE or DRAFT projects
 *
 * Patch 2: Returns isRedirecting to prevent Home flicker
 */
export function usePhase5_1Redirect(): { isRedirecting: boolean } {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWorkspaceId, workspaceRole, canWrite } = useWorkspaceStore();
  const { user } = useAuth();
  const { workspaceRole: fetchedRole } = useWorkspaceRole(activeWorkspaceId);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Only check on /home route
    if (location.pathname !== '/home') {
      setIsRedirecting(false);
      return;
    }

    // Need workspace to check projects
    if (!activeWorkspaceId) {
      setIsRedirecting(false);
      return;
    }

    // Wait for role to be fetched (use fetchedRole from useWorkspaceRole hook)
    // Use workspaceRole from store if available, otherwise wait for fetchedRole
    const effectiveRole = workspaceRole || fetchedRole;

    // If role is still being fetched, don't redirect yet (prevent false positives)
    if (!effectiveRole) {
      setIsRedirecting(false);
      return;
    }

    // Only redirect delivery_owner or workspace_owner
    const isDeliveryOwner = effectiveRole === 'delivery_owner' || effectiveRole === 'workspace_owner';

    // If not a delivery owner, stay on home
    if (!isDeliveryOwner) {
      setIsRedirecting(false);
      return;
    }

    // Check if workspace has any ACTIVE or DRAFT projects
    const checkProjects = async () => {
      try {
        // Patch 2: Set redirecting before check to prevent flicker
        setIsRedirecting(true);

        // Get all projects for workspace, then filter client-side
        const response = await api.get(`/projects?workspaceId=${activeWorkspaceId}`);
        const projects = response.data?.data?.projects || response.data?.projects || [];

        // Filter for ACTIVE or DRAFT state (project.state field, not status)
        const activeOrDraftProjects = projects.filter((p: any) =>
          p.state === 'ACTIVE' || p.state === 'DRAFT' ||
          p.projectState === 'ACTIVE' || p.projectState === 'DRAFT'
        );

        // If zero active/draft projects, redirect to templates
        if (activeOrDraftProjects.length === 0) {
          navigate('/templates', { replace: true });
        } else {
          setIsRedirecting(false);
        }
      } catch (error) {
        console.error('Failed to check projects for redirect:', error);
        setIsRedirecting(false);
        // On error, allow user to stay on home
      }
    };

    checkProjects();
  }, [location.pathname, activeWorkspaceId, workspaceRole, fetchedRole, navigate]);

  return { isRedirecting };
}

