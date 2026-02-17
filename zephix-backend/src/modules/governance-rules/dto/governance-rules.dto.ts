import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import {
  ScopeType,
  GovernanceEntityType,
  EnforcementMode,
} from '../entities/governance-rule-set.entity';
import { RuleDefinition } from '../entities/governance-rule.entity';

export class CreateRuleSetDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @IsEnum(GovernanceEntityType)
  entityType: GovernanceEntityType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EnforcementMode)
  enforcementMode?: EnforcementMode;
}

export class UpdateRuleSetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EnforcementMode)
  enforcementMode?: EnforcementMode;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddRuleVersionDto {
  @IsString()
  code: string;

  @IsObject()
  ruleDefinition: RuleDefinition;

  @IsOptional()
  @IsBoolean()
  setActive?: boolean;
}

export class SetActiveVersionDto {
  @IsString()
  code: string;

  @IsUUID()
  ruleId: string;
}

export class ListEvaluationsQueryDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  decision?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
