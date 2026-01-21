import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardVisibility } from '../entities/dashboard.entity';

export class CreateDashboardDto {
  @ApiProperty({ description: 'Dashboard name', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

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

  @ApiProperty({
    description: 'Dashboard visibility',
    enum: DashboardVisibility,
    default: DashboardVisibility.PRIVATE,
  })
  @IsEnum(DashboardVisibility)
  visibility: DashboardVisibility;
}
