import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from './invite-user.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  organizationRole?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}









