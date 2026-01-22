import { IsArray, IsEnum, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task.enums';

export class BulkStatusUpdateDto {
  @ApiProperty({ description: 'Array of task IDs to update', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  taskIds: string[];

  @ApiProperty({ description: 'New status for all tasks', enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
