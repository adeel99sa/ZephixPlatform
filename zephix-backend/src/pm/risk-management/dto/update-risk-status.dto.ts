import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export class UpdateRiskStatusDto {
  @ApiProperty({ 
    description: 'New status for the risk',
    enum: ['identified', 'active', 'mitigated', 'closed', 'escalated']
  })
  @IsEnum(['identified', 'active', 'mitigated', 'closed', 'escalated'])
  status: string;

  @ApiProperty({ 
    description: 'Notes about the status change',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
