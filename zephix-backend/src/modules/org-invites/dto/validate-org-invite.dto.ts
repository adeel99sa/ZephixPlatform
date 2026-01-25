import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateOrgInviteDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}
