import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DependencyType } from '../enums/task.enums';

export class RemoveDependencyDto {
  @ApiProperty({ description: 'Predecessor task ID' })
  @IsUUID()
  predecessorTaskId: string;

  @ApiProperty({ description: 'Dependency type', enum: DependencyType, required: false })
  @IsOptional()
  @IsEnum(DependencyType)
  type?: DependencyType;
}

