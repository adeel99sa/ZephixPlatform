import { IsEmail, IsEnum, IsUUID, IsOptional, IsArray } from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  projectIds?: string[];

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;
}








