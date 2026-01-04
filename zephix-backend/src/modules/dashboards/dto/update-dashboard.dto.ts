import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardVisibility } from '../entities/dashboard.entity';

export class UpdateDashboardDto {
  @ApiPropertyOptional({ description: 'Dashboard name', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Dashboard description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Workspace ID (required for WORKSPACE visibility)',
  })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Dashboard visibility',
    enum: DashboardVisibility,
  })
  @IsEnum(DashboardVisibility)
  @IsOptional()
  visibility?: DashboardVisibility;
}

