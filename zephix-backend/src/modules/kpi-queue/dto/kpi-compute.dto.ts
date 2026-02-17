import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ComputeKpisQueryDto {
  @IsOptional()
  @IsDateString()
  asOf?: string;
}

export class ComputeStatusResponseDto {
  pending: boolean;
  jobId: string | null;
  lastComputedAt: Record<string, string | null>;
  lastFailure: string | null;
}
