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
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  // Only call useWorkspaceRole if activeWorkspaceId exists to prevent errors
  // Pass null explicitly to avoid calling the hook with undefined
  const { role: workspaceRole, canWrite } = useWorkspaceRole(activeWorkspaceId ?? null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Never redirect on org-level routes — Home must stay Home
    const ORG_LEVEL_PREFIXES = ['/home', '/workspaces', '/settings', '/billing', '/admin', '/onboarding'];
    if (ORG_LEVEL_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
      setIsRedirecting(false);
      return;
    }

    // Only check on workspace-scoped routes (this hook was originally for /home but
    // the redirect-to-templates behaviour belongs on workspace overview, not org home)
    // Need workspace to check projects - early return if no workspace
    if (!activeWorkspaceId) {
      setIsRedirecting(false);
      return;
    }

    // Need user to check role
    if (!user) {
      setIsRedirecting(false);
      return;
    }

    // Wait for role to be fetched from useWorkspaceRole hook
    const effectiveRole = workspaceRole;

    // If role is still being fetched, don't redirect yet (prevent false positives)
    if (!effectiveRole) {
      setIsRedirecting(false);
      return;
    }

    // Only redirect if user has ADMIN or OWNER role (which map to delivery/workspace owners)
    const isDeliveryOwner = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER';

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
        // API interceptor unwraps response, so response might already be the data
        // Handle both wrapped and unwrapped responses
        const responseData = response?.data || response;
        const projects = responseData?.data?.projects || responseData?.projects || responseData || [];
        
        // Ensure projects is an array
        if (!Array.isArray(projects)) {
          console.warn('Projects response is not an array:', projects);
          setIsRedirecting(false);
          return;
        }

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
  }, [location.pathname, activeWorkspaceId, workspaceRole, navigate]);

  return { isRedirecting };
}

