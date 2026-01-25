import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardShareAccess } from '../domain/dashboard.enums';

export class CreateDashboardShareDto {
  @ApiProperty({ description: 'Email of user to invite' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Access level', enum: DashboardShareAccess })
  @IsEnum(DashboardShareAccess)
  accessLevel!: DashboardShareAccess;

  @ApiPropertyOptional({ description: 'Allow export', default: false })
  @IsBoolean()
  @IsOptional()
  exportAllowed?: boolean;
}

export class UpdateDashboardShareDto {
  @ApiProperty({ description: 'Access level', enum: DashboardShareAccess })
  @IsEnum(DashboardShareAccess)
  accessLevel!: DashboardShareAccess;

  @ApiPropertyOptional({ description: 'Allow export' })
  @IsBoolean()
  @IsOptional()
  exportAllowed?: boolean;
}
