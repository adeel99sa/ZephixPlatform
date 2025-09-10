import { IsEmail, IsNotEmpty, IsString, IsInt, Min, Max, IsUUID, IsOptional, IsArray, IsBoolean, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ 
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ 
    description: 'Resource name',
    example: 'John Smith',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-zA-Z\s\-']+$/, { 
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes' 
  })
  name: string;

  @ApiProperty({ 
    description: 'Resource email',
    example: 'john.smith@company.com'
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Resource role',
    example: 'Senior Developer',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-zA-Z\s\-&]+$/, { 
    message: 'Role can only contain letters, spaces, hyphens, and ampersands' 
  })
  role: string;

  @ApiProperty({ 
    description: 'List of skills',
    example: ['TypeScript', 'React', 'Node.js'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ 
    description: 'Capacity in hours per week',
    example: 40,
    minimum: 0,
    maximum: 168
  })
  @IsInt()
  @Min(0, { message: 'Capacity cannot be negative' })
  @Max(168, { message: 'Capacity cannot exceed 168 hours per week' })
  capacityHoursPerWeek: number;

  @ApiProperty({ 
    description: 'Cost per hour in USD',
    example: 150.00,
    minimum: 0
  })
  @IsInt()
  @Min(0, { message: 'Cost cannot be negative' })
  costPerHour: number;

  @ApiProperty({ 
    description: 'Whether resource is active',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Resource preferences',
    example: {
      maxAllocation: 100,
      preferredProjects: ['project-1', 'project-2'],
      unavailableDates: ['2025-12-25', '2025-12-26']
    },
    required: false
  })
  @IsOptional()
  preferences?: {
    maxAllocation: number;
    preferredProjects: string[];
    unavailableDates: string[];
  };
}
