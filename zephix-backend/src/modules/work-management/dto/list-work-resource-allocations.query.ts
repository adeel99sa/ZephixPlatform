import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListWorkResourceAllocationsQueryDto {
  @ApiProperty({ description: 'Project ID', required: true })
  @IsUUID()
  projectId: string;
}
