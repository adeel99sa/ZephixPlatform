import React from 'react';
import { useWorkspaceModule } from '../../../hooks/useWorkspaceModule';

interface WorkspaceModuleGuardProps {
  workspaceId: string;
  moduleKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WorkspaceModuleGuard({
  workspaceId,
  moduleKey,
  children,
  fallback,
}: WorkspaceModuleGuardProps) {
  const { data: config, isLoading } = useWorkspaceModule(workspaceId, moduleKey);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!config || !config.enabled) {
    return <>{fallback || <div>Module {moduleKey} is not enabled</div>}</>;
  }

  return <>{children}</>;
}





