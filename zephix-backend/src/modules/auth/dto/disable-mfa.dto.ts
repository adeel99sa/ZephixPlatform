import { IsString, MinLength } from 'class-validator';

export class DisableMfaDto {
  /** Current password — required to disable MFA so a stolen access token alone cannot remove it. */
  @IsString()
  @MinLength(1)
  currentPassword: string;
}
