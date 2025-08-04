import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleType } from '../entities/role.entity';

export class AddTeamMemberDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: RoleType, example: RoleType.EDITOR })
  @IsEnum(RoleType)
  role: RoleType;
} 