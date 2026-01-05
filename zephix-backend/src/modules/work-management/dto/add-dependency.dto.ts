import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DependencyType } from '../enums/task.enums';

export class AddDependencyDto {
  @ApiProperty({ description: 'Predecessor task ID (task that must complete first)' })
  @IsUUID()
  predecessorTaskId: string;

  @ApiProperty({ description: 'Dependency type', enum: DependencyType, required: false, default: DependencyType.FINISH_TO_START })
  @IsOptional()
  @IsEnum(DependencyType)
  type?: DependencyType;
}

