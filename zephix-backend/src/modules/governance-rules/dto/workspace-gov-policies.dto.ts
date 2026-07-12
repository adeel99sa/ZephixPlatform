import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertWorkspaceGovPolicyDto {
  @IsString()
  workspaceId: string;

  @IsBoolean()
  isEnabled: boolean;

  @IsOptional()
  params?: Record<string, any>;
}

export interface PolicyView {
  code: string;
  name: string;
  /** GOV-FIX-B1 (1.1): self-describing catalog fields. */
  humanLabel: string;
  description: string;
  scope: string;
  /** The runtime event this policy hooks (from POLICY_ENFORCEMENT_POINT). */
  enforcementPoint: string;
  /** Effective outcome when enabled: BLOCK|WARN (null when disabled). Alias of severityEffective. */
  outcome: 'BLOCK' | 'WARN' | null;
  severityEffective: 'BLOCK' | 'WARN' | null;
  source: 'workspace' | 'bundle' | 'disabled';
  enabled: boolean;
  isEnabled: boolean;
  /**
   * Honesty primitive: false when no evaluator/data source exists for this code
   * (the skipped promotions). NEVER faked true — the UI keys off this so it does
   * not claim a policy protects when it cannot.
   */
  isEvaluable: boolean;
  params: Record<string, any> | null;
  bundleDefaults: { LEAN: boolean; STANDARD: boolean; GOVERNED: boolean };
}
