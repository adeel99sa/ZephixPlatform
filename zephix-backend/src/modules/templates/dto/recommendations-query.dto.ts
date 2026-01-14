import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkTypeTag, ComplexityBucket } from '../enums/template.enums';

export class RecommendationsQueryDto {
  @IsEnum(['PROJECT', 'PROGRAM'], {
    message: 'containerType must be PROJECT or PROGRAM',
  })
  containerType: 'PROJECT' | 'PROGRAM';

  @IsEnum(WorkTypeTag, {
    message:
      'workType must be one of: MIGRATION, IMPLEMENTATION, SYSTEM_TRANSITION, INTEGRATION',
  })
  workType: WorkTypeTag;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'durationDays must be an integer' })
  @Min(1, { message: 'durationDays must be at least 1' })
  @Max(3650, { message: 'durationDays must be at most 3650' })
  durationDays?: number;

  @IsOptional()
  @IsEnum(ComplexityBucket, {
    message: 'complexity must be one of: LOW, MEDIUM, HIGH',
  })
  complexity?: ComplexityBucket;
}
