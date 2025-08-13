import { IsObject, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBRDDto {
  @ApiProperty({
    description: 'Updated BRD payload conforming to the JSON schema',
    example: {
      metadata: {
        title: 'Updated Customer Portal Enhancement',
        summary:
          'Enhanced customer portal with additional self-service features',
        version: '1.1.0',
        department: 'Product',
        industry: 'Technology',
        priority: 'High',
        documentOwner: {
          name: 'Jane Smith',
          email: 'jane.smith@company.com',
          role: 'Senior Product Manager',
        },
      },
      businessContext: {
        problemStatement:
          'Current customer portal lacks comprehensive self-service functionality',
        businessObjective:
          'Significantly improve customer experience and reduce support costs by 40%',
      },
      functionalRequirements: [
        {
          id: 'FR-001',
          title: 'Enhanced User Authentication',
          description:
            'Users must be able to securely authenticate with MFA support',
          priority: 'Must Have',
          category: 'Security',
          acceptanceCriteria: [
            'Users can log in securely',
            'Multi-factor authentication is supported',
          ],
        },
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;
}
