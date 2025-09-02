import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the team member',
    enum: ['admin', 'pm', 'viewer'],
    example: 'admin',
  })
  @IsEnum(['admin', 'pm', 'viewer'])
  role: 'admin' | 'pm' | 'viewer';
}
