import {
  IsOptional,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateWorkflowConfigDto {
  @ApiPropertyOptional({
    description: 'Default WIP limit for any non-terminal status',
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  defaultWipLimit?: number | null;

  @ApiPropertyOptional({
    description:
      'Per-status WIP limit overrides. Keys must be valid non-terminal statuses.',
    example: { IN_PROGRESS: 3, IN_REVIEW: 1 },
  })
  @IsOptional()
  statusWipLimits?: Record<string, number> | null;
}
