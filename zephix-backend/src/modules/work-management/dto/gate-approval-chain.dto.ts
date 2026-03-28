import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalType } from '../entities/gate-approval-chain-step.entity';

export class CreateApprovalStepDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Step description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Required role (e.g. ADMIN, PMO, FINANCE)' })
  @IsOptional()
  @IsString()
  requiredRole?: string;

  @ApiPropertyOptional({ description: 'Specific user UUID who must approve' })
  @IsOptional()
  @IsUUID()
  requiredUserId?: string;

  @ApiPropertyOptional({
    enum: ApprovalType,
    default: ApprovalType.ANY_ONE,
    description: 'ANY_ONE = single approval completes step; ALL = minApprovals required',
  })
  @IsOptional()
  @IsEnum(ApprovalType)
  approvalType?: ApprovalType;

  @ApiPropertyOptional({ description: 'Minimum approvals for ALL type', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  minApprovals?: number;

  @ApiPropertyOptional({ description: 'Auto-approve after N hours (null = disabled)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  autoApproveAfterHours?: number;
}

export class CreateApprovalChainDto {
  @ApiProperty({ description: 'Gate definition ID this chain belongs to' })
  @IsUUID()
  gateDefinitionId: string;

  @ApiProperty({ description: 'Chain name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Chain description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [CreateApprovalStepDto], description: 'Ordered approval steps' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalStepDto)
  steps: CreateApprovalStepDto[];
}

export class ReorderStepsDto {
  @ApiProperty({ type: [String], description: 'Step IDs in new order' })
  @IsArray()
  @IsUUID('all', { each: true })
  stepIds: string[];
}

export class ApprovalActionDto {
  @ApiPropertyOptional({ description: 'Optional note for the decision' })
  @IsOptional()
  @IsString()
  note?: string;
}
