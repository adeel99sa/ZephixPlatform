import { IsOptional, IsInt, Min, Max } from 'class-validator';

/**
 * PROMPT 7: Create Invite Link DTO
 */
export class CreateInviteLinkDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}
