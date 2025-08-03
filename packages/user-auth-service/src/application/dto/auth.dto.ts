import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean = false;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;

  @IsString()
  token!: string;
}

export class VerifyEmailDto {
  @IsString()
  token!: string;
}

// Legacy DTOs for backward compatibility
export class RegisterDto extends CreateUserDto {}
export class PasswordResetRequestDto extends ResetPasswordDto {}
export class PasswordResetDto extends ChangePasswordDto {}
export class PasswordChangeDto extends ChangePasswordDto {}
export class EmailVerificationDto extends VerifyEmailDto {}

// MFA DTOs
export class MFASetupDto {
  @IsString()
  mfaToken!: string;
}

export class MFAVerificationDto {
  @IsString()
  mfaToken!: string;
}

// Token DTOs
export class TokenRefreshDto {
  @IsString()
  refreshToken!: string;
}

// Profile DTOs
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  website?: string;
} 