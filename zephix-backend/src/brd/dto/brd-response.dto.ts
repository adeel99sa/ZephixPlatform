import { ApiProperty } from '@nestjs/swagger';
import { BRDStatus } from '../entities/brd.entity';

export class BRDResponseDto {
  @ApiProperty({
    description: 'BRD unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Associated project ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  project_id: string | null;

  @ApiProperty({
    description: 'Document version number',
    example: 1,
  })
  version: number;

  @ApiProperty({
    description: 'Current status of the BRD',
    enum: BRDStatus,
    example: BRDStatus.DRAFT,
  })
  status: BRDStatus;

  @ApiProperty({
    description: 'BRD content payload',
    example: {
      metadata: {
        title: 'Customer Portal Enhancement',
        summary: 'Enhance customer portal with self-service features',
        version: '1.0.0',
        department: 'Product',
        industry: 'Technology',
        priority: 'High',
      },
      businessContext: {
        problemStatement: 'Current customer portal lacks self-service functionality',
        businessObjective: 'Improve customer experience and reduce support costs',
      },
      functionalRequirements: [],
    },
  })
  payload: Record<string, any>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T14:45:00Z',
  })
  updated_at: Date;

  // Helper properties extracted from payload
  @ApiProperty({
    description: 'BRD title from metadata',
    example: 'Customer Portal Enhancement',
  })
  title: string;

  @ApiProperty({
    description: 'BRD summary from metadata',
    example: 'Enhance customer portal with self-service features',
  })
  summary: string;

  @ApiProperty({
    description: 'Industry from metadata',
    example: 'Technology',
  })
  industry: string;

  @ApiProperty({
    description: 'Department from metadata',
    example: 'Product',
  })
  department: string;
}

export class BRDListResponseDto {
  @ApiProperty({
    description: 'List of BRDs',
    type: [BRDResponseDto],
  })
  data: BRDResponseDto[];

  @ApiProperty({
    description: 'Total number of BRDs matching the query',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;
}

export class BRDCreateResponseDto {
  @ApiProperty({
    description: 'Newly created BRD ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Initial version number',
    example: 1,
  })
  version: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;
}

export class BRDUpdateResponseDto {
  @ApiProperty({
    description: 'Updated BRD ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'New version number after update',
    example: 2,
  })
  version: number;

  @ApiProperty({
    description: 'Update timestamp',
    example: '2024-01-15T14:45:00Z',
  })
  updated_at: Date;
}