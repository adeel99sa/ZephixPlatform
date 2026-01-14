import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InstantiateV51Dto {
  @ApiProperty({
    description: 'Project name (required if projectId not provided)',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiProperty({
    description: 'Existing project ID to instantiate into (must be DRAFT)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
