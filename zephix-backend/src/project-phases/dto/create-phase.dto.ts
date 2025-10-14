import { IsInt, IsOptional, IsString, IsUUID, IsIn, IsDateString } from 'class-validator';

export class CreatePhaseDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['not-started', 'in-progress', 'blocked', 'done'])
  status: string;

  @IsInt()
  order: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string | null;

  @IsOptional()
  @IsUUID()
  workspaceId?: string | null;
}
