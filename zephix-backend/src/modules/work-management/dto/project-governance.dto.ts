import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { GateDecisionType } from '../enums/gate-decision-type.enum';

export class CreateProjectApprovalDto {
  @IsUUID()
  phaseId: string;

  @IsUUID()
  gateDefinitionId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  documentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklistAnswers?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ApprovalDecisionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

/** C-5: PMBOK gate decision on a submitted approval (submission id = approvalId). */
export class ApprovalGateConditionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;
}

export class ApprovalGateDecisionDto {
  @IsEnum(GateDecisionType)
  decision: GateDecisionType;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalGateConditionDto)
  conditions?: ApprovalGateConditionDto[];

  @IsOptional()
  @IsUUID()
  nextPhaseId?: string;
}

/** One row in `conditions[]` for CONDITIONAL_GO. */
export class GateConditionPayloadItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** PMBOK-style gate execution (Prompt 3). */
export class ExecuteGateDecisionDto {
  @IsEnum(GateDecisionType)
  decision: GateDecisionType;

  @ValidateIf((o: ExecuteGateDecisionDto) => o.decision === GateDecisionType.CONDITIONAL_GO)
  @IsUUID()
  @IsNotEmpty()
  nextPhaseId?: string;

  @ValidateIf((o: ExecuteGateDecisionDto) => o.decision === GateDecisionType.CONDITIONAL_GO)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GateConditionPayloadItemDto)
  conditions?: GateConditionPayloadItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CreateRaidItemDto {
  @IsIn(['RISK', 'ASSUMPTION', 'ISSUE', 'DECISION', 'ACTION'])
  type: 'RISK' | 'ASSUMPTION' | 'ISSUE' | 'DECISION' | 'ACTION';

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsIn(['OPEN', 'MITIGATED', 'ACCEPTED', 'CLOSED', 'TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'])
  status?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedDocumentIds?: string[];
}

export class UpdateRaidItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsIn(['OPEN', 'MITIGATED', 'ACCEPTED', 'CLOSED', 'TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'])
  status?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedDocumentIds?: string[];
}

export class CreateProjectReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  title: string;

  @IsOptional()
  @IsDateString()
  reportingPeriodStart?: string;

  @IsOptional()
  @IsDateString()
  reportingPeriodEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  phase?: string;

  @IsOptional()
  @IsIn(['GREEN', 'AMBER', 'RED'])
  overallStatus?: 'GREEN' | 'AMBER' | 'RED';

  @IsOptional()
  @IsIn(['GREEN', 'AMBER', 'RED'])
  scheduleStatus?: 'GREEN' | 'AMBER' | 'RED';

  @IsOptional()
  @IsIn(['GREEN', 'AMBER', 'RED'])
  resourceStatus?: 'GREEN' | 'AMBER' | 'RED';

  @IsOptional()
  @IsString()
  executiveSummary?: string;

  @IsOptional()
  @IsString()
  currentActivities?: string;

  @IsOptional()
  @IsString()
  nextWeekActivities?: string;

  @IsOptional()
  @IsString()
  helpNeeded?: string;
}

export class UpdateProjectReportDto extends CreateProjectReportDto {}
