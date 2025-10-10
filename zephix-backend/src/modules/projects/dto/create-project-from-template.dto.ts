import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectFromTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;
}
