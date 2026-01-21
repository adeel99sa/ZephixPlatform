import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class LinkProjectDto {
  @ApiProperty({
    description: 'Portfolio ID (optional)',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsUUID()
  portfolioId?: string;

  @ApiProperty({
    description: 'Program ID (optional)',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsUUID()
  programId?: string;
}
