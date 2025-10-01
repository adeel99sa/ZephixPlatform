import { IsEmail, IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsArray } from 'class-validator';

export class InviteResourceDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  organizationId?: string; // Will be set from JWT token

  @IsOptional()
  @IsEnum(['full_member', 'guest', 'external'])
  resourceType?: 'full_member' | 'guest' | 'external';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  weeklyCapacity?: number;

  @IsOptional()
  @IsString()
  message?: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;
}

export class BulkInviteDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];

  @IsOptional()
  @IsString()
  organizationId?: string; // Will be set from JWT token

  @IsOptional()
  @IsEnum(['full_member', 'guest', 'external'])
  resourceType?: 'full_member' | 'guest' | 'external';
}
