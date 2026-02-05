import { ForbiddenException } from '@nestjs/common';

export type TemplateCenterScope = {
  organizationId: string;
  workspaceId?: string | null;
};

/**
 * Derives enforced scope from request context.
 * No parameters from query string may widen access beyond the authenticated scope.
 */
export function getTemplateCenterScope(
  auth: { organizationId?: string | null; workspaceIds?: string[] },
  workspaceIdFromQuery?: string,
): TemplateCenterScope {
  if (!auth?.organizationId) {
    throw new ForbiddenException('missing_org_context');
  }

  const scope: TemplateCenterScope = {
    organizationId: auth.organizationId,
    workspaceId: undefined,
  };

  if (workspaceIdFromQuery) {
    const allowed = Array.isArray(auth.workspaceIds) ? auth.workspaceIds : [];
    const singleWs = (auth as { workspaceId?: string }).workspaceId;
    if (singleWs) allowed.push(singleWs);
    if (!allowed.includes(workspaceIdFromQuery)) {
      throw new ForbiddenException('workspace_not_allowed');
    }
    scope.workspaceId = workspaceIdFromQuery;
  }

  return scope;
}
