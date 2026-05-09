import { IsString, Matches } from 'class-validator';

export class VerifyMfaDto {
  /** Six-digit TOTP code from the authenticator app. */
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be exactly six digits' })
  code: string;
}
