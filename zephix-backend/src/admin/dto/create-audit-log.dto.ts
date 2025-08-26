import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateAuditLogDto {
  @ApiProperty({ description: 'Action being performed' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Type of entity being acted upon', required: false })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiProperty({ description: 'ID of entity being acted upon', required: false })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ description: 'Previous values before change', required: false })
  @IsOptional()
  @IsObject()
  oldValues?: any;

  @ApiProperty({ description: 'New values after change', required: false })
  @IsOptional()
  @IsObject()
  newValues?: any;

  @ApiProperty({ description: 'IP address of the request', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'User agent of the request', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
