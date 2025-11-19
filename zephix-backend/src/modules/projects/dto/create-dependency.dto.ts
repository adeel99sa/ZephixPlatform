import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsUrl,
} from 'class-validator';

export class CreateDependencyDto {
  @IsEnum([
    'quick_text',
    'internal_task',
    'external',
    'vendor',
    'approval',
    'milestone',
  ])
  dependencyType: string;

  @IsUUID()
  @IsOptional()
  dependsOnTaskId?: string;

  @IsString()
  description: string;

  @IsEnum(['blocks', 'blocked_by', 'related_to'])
  @IsOptional()
  relationshipType?: string = 'blocks';

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsNumber()
  @IsOptional()
  leadLagDays?: number = 0;

  @IsUrl()
  @IsOptional()
  externalUrl?: string;

  @IsString()
  @IsOptional()
  externalSystem?: string;

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsString()
  @IsOptional()
  vendorName?: string;
}
