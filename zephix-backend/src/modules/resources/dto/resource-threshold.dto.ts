import { IsNumber, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateResourceThresholdDto {
  @ApiProperty({ description: 'Warning threshold percentage (50-150)', example: 80 })
  @IsNumber()
  @Min(50)
  @Max(150)
  warningThreshold: number;
  
  @ApiProperty({ description: 'Critical threshold percentage (80-200)', example: 100 })
  @IsNumber()
  @Min(80)
  @Max(200)
  criticalThreshold: number;
  
  @ApiProperty({ description: 'Maximum threshold percentage (100-250)', example: 120 })
  @IsNumber()
  @Min(100)
  @Max(250)
  maxThreshold: number;
}

export class ResourceConflictDto {
  @ApiProperty()
  resourceId: string;
  
  @ApiProperty()
  resourceName: string;
  
  @ApiProperty()
  projectId: string;
  
  @ApiProperty()
  projectName: string;
  
  @ApiProperty()
  weekStart: Date;
  
  @ApiProperty()
  allocationPercentage: number;
  
  @ApiProperty()
  conflictType: 'warning' | 'critical' | 'over_max';
  
  @ApiProperty()
  resolved: boolean;
}



