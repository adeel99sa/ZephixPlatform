import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type InviteRole = 'admin' | 'member' | 'viewer';

/**
 * Create Invite DTO
 */
export class CreateInviteDto {
  @ApiProperty({
    description: 'Email address to invite',
    example: 'newuser@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Organization role for the invite',
    enum: ['admin', 'member', 'viewer'],
    example: 'member',
  })
  @IsEnum(['admin', 'member', 'viewer'])
  @IsNotEmpty()
  role: InviteRole;

  @ApiProperty({
    description: 'Optional message to include in invitation email',
    required: false,
    example: 'Welcome to the team!',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class CreateInviteResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Invitation sent successfully',
  })
  message: string;
}

/**
 * Accept Invite DTO
 */
export class AcceptInviteDto {
  @ApiProperty({
    description: 'Invitation token',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class AcceptInviteResponseDto {
  @ApiProperty({
    description: 'Organization ID that was joined',
    example: 'uuid-org-id',
  })
  orgId: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Invitation accepted successfully',
  })
  message: string;
}
