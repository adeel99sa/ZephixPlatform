import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBRDDto {
  @ApiProperty({
    description: 'Tenant ID for multi-tenancy',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'Optional project ID to associate BRD with',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiProperty({
    description: 'BRD payload conforming to the JSON schema',
    example: {
      metadata: {
        title: 'Customer Portal Enhancement',
        summary: 'Enhance customer portal with self-service features',
        version: '1.0.0',
        department: 'Product',
        industry: 'Technology',
        priority: 'High',
        documentOwner: {
          name: 'John Doe',
          email: 'john.doe@company.com',
          role: 'Product Manager',
        },
      },
      businessContext: {
        problemStatement:
          'Current customer portal lacks self-service functionality',
        businessObjective:
          'Improve customer experience and reduce support costs',
      },
      functionalRequirements: [
        {
          id: 'FR-001',
          title: 'User Authentication',
          description: 'Users must be able to securely authenticate',
          priority: 'Must Have',
          category: 'Security',
          acceptanceCriteria: ['Users can log in securely'],
        },
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;
}
