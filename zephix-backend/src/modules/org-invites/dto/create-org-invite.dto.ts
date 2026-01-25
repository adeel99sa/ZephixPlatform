import { IsEmail, IsString, IsIn } from 'class-validator';

export class CreateOrgInviteDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString()
  @IsIn(['admin', 'member', 'viewer'], {
    message: 'Role must be one of: admin, member, viewer',
  })
  role: 'admin' | 'member' | 'viewer';
}
