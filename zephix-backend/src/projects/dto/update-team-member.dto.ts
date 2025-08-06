import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleType } from '../entities/role.entity';

export class UpdateTeamMemberDto {
  @ApiProperty({ enum: RoleType, example: RoleType.EDITOR })
  @IsEnum(RoleType)
  role: RoleType;
}
