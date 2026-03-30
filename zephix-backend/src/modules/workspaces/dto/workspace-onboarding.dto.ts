import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceOnboardingDto {
  @ApiProperty({
    description: 'Display name for the first workspace (and new organization)',
    example: 'Acme Delivery',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  workspaceName: string;
}
