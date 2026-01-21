/**
 * PROMPT 9: Admin Invite DTO with Workspace Assignments
 */
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PlatformRoleEnum {
  MEMBER = 'Member',
  GUEST = 'Guest',
}

export class WorkspaceAssignmentDto {
  @IsEnum(['Member', 'Guest'])
  accessLevel: 'Member' | 'Guest';

  workspaceId: string;
}

export class AdminInviteDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];

  @IsEnum(PlatformRoleEnum)
  platformRole: 'Member' | 'Guest';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceAssignmentDto)
  workspaceAssignments?: WorkspaceAssignmentDto[];
}

export class InviteResultDto {
  email: string;
  status: 'success' | 'error';
  message?: string;
}

export class AdminInviteResponseDto {
  @IsArray()
  results: InviteResultDto[];
}
