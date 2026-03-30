import { Injectable } from '@nestjs/common';

export interface GovernancePolicyRow {
  id: string;
  name: string;
  scopeType: string;
  scopeTargetId: string | null;
  active: boolean;
  lockedComponents: string[];
  mandatoryBaselineTemplateId: string | null;
  createdAt: Date;
}

@Injectable()
export class GovernancePoliciesService {
  async listPolicies(
    _orgId: string,
    _scopeType?: string,
    _active?: boolean,
  ): Promise<GovernancePolicyRow[]> {
    return [];
  }

  async createPolicy(_orgId: string, _dto: unknown): Promise<unknown> {
    return {};
  }
}