import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the team member',
    enum: ['admin', 'member', 'viewer'],
    example: 'admin',
  })
  @IsEnum(['admin', 'member', 'viewer'])
  role: 'admin' | 'member' | 'viewer';
}
