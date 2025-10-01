import { IsEmail, IsString, IsIn } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['admin', 'member', 'viewer'])
  role: string;

  @IsString()
  organizationId: string;
}





