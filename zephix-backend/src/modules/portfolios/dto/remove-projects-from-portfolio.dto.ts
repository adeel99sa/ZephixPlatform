import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveProjectsFromPortfolioDto {
  @ApiProperty({
    description: 'Array of project IDs to remove from the portfolio',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one project ID is required' })
  @IsUUID('4', { each: true })
  projectIds: string[];
}
