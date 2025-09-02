import {
  IsOptional,
  IsUUID,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BRDStatus } from '../entities/brd.entity';

export class BRDQueryDto {
  @ApiProperty({
    description: 'Tenant ID for filtering',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: 'Filter by BRD status',
    enum: BRDStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(BRDStatus)
  status?: BRDStatus;

  @ApiProperty({
    description: 'Filter by project ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiProperty({
    description: 'Filter by industry from metadata',
    example: 'Technology',
    required: false,
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    description: 'Filter by department from metadata',
    example: 'Product',
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: 'Full-text search query',
    example: 'customer portal enhancement',
    required: false,
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Sort field',
    example: 'created_at',
    required: false,
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  sort?: string = 'created_at';

  @ApiProperty({
    description: 'Sort order',
    example: 'DESC',
    required: false,
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
