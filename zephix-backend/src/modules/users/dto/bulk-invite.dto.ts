import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InviteUserDto } from './invite-user.dto';

export class BulkInviteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteUserDto)
  users: InviteUserDto[];
}



