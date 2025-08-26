import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsOptional, IsUUID } from 'class-validator';

export class RiskMonitoringDto {
  @ApiProperty({ 
    description: 'Monitoring frequency',
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly']
  })
  @IsEnum(['daily', 'weekly', 'bi-weekly', 'monthly'])
  frequency: string;

  @ApiProperty({ 
    description: 'Key Performance Indicators for monitoring',
    type: [Object]
  })
  @IsArray()
  kpis: any[];

  @ApiProperty({ 
    description: 'User ID assigned to monitor this risk'
  })
  @IsUUID()
  assignedTo: string;
}
