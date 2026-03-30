import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceGovernanceService {
  async getConfig(
    _orgId: string,
    _workspaceId: string,
  ): Promise<{ enforced: boolean; policies: unknown[] }> {
    return { enforced: false, policies: [] };
  }

  async validate(
    _orgId: string,
    _workspaceId: string,
    _action?: string,
    _component?: string,
  ): Promise<{ allowed: boolean; reason?: string; policyName?: string; code?: string }> {
    return { allowed: true };
  }

  async applyPolicyForNewWorkspace(
    _workspace: { id: string; organizationId: string; workspaceGroupId: string | null },
    _manager?: unknown,
  ): Promise<void> {}
}