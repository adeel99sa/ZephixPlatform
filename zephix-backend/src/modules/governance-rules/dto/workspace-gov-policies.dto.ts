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
  description: string;
  scope: string;
  severityEffective: 'BLOCK' | 'WARN' | null;
  source: 'workspace' | 'bundle' | 'disabled';
  isEnabled: boolean;
  params: Record<string, any> | null;
  bundleDefaults: { LEAN: boolean; STANDARD: boolean; GOVERNED: boolean };
}
