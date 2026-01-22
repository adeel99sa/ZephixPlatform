import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivateTemplateDto {
  @ApiProperty({ description: 'Template key', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  templateKey: string;

  @ApiPropertyOptional({
    description: 'Workspace ID (required for WORKSPACE visibility templates)',
  })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;
}
