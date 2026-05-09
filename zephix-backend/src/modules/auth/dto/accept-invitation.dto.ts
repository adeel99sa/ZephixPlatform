import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Request body for `POST /api/v1/invitations/:token/accept`.
 *
 * Both fields are optional at the DTO level so the same endpoint serves
 * authenticated existing-user flows (body ignored) and unauthenticated
 * new-user flows (server enforces presence of both fields after detecting
 * no auth).
 */
export class AcceptInvitationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
