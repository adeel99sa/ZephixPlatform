import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApprovalRuleType {
  ROLE = 'role',
  USER = 'user',
  THRESHOLD = 'threshold',
}

export class ApprovalRuleDto {
  @ApiProperty({
    enum: ApprovalRuleType,
    description: 'Type of approval rule',
  })
  @IsEnum(ApprovalRuleType)
  type: ApprovalRuleType;

  @ApiPropertyOptional({
    description: 'Array of approver IDs (for USER type)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverIds?: string[];

  @ApiPropertyOptional({
    description: 'Minimum number of approvals required (for THRESHOLD type)',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minApprovals?: number;
}
