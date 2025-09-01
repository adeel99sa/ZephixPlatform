import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Logger,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';
import { SecuritySettingsService } from '../services/security-settings.service';
import { 
  IsObject, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsArray, 
  IsString,
  Min, 
  Max,
  ArrayMaxSize
} from 'class-validator';

// DTOs for API validation
class PasswordPolicyDto {
  @ApiProperty({ description: 'Minimum password length', example: 8, minimum: 6, maximum: 128 })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(128)
  minLength?: number;

  @ApiProperty({ description: 'Require uppercase letters', example: true })
  @IsOptional()
  @IsBoolean()
  requireUppercase?: boolean;

  @ApiProperty({ description: 'Require lowercase letters', example: true })
  @IsOptional()
  @IsBoolean()
  requireLowercase?: boolean;

  @ApiProperty({ description: 'Require numbers', example: true })
  @IsOptional()
  @IsBoolean()
  requireNumbers?: boolean;

  @ApiProperty({ description: 'Require special characters', example: true })
  @IsOptional()
  @IsBoolean()
  requireSpecialChars?: boolean;

  @ApiProperty({ description: 'Password maximum age in days', example: 90, minimum: 1, maximum: 365 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  maxAge?: number;
}

class SessionPolicyDto {
  @ApiProperty({ description: 'Maximum concurrent sessions per user', example: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxSessions?: number;

  @ApiProperty({ description: 'Session timeout in minutes', example: 15, minimum: 5, maximum: 480 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(480)
  sessionTimeout?: number;

  @ApiProperty({ description: 'Idle timeout in minutes', example: 60, minimum: 5, maximum: 1440 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  idleTimeout?: number;
}

class IpRestrictionsDto {
  @ApiProperty({ description: 'Enable IP restrictions', example: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Allowed IP ranges (CIDR format)', example: ['192.168.1.0/24', '10.0.0.0/8'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  allowedRanges?: string[];

  @ApiProperty({ description: 'Blocked IP ranges (CIDR format)', example: ['192.168.1.100/32'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  blockedRanges?: string[];
}

class TwoFactorPolicyDto {
  @ApiProperty({ description: 'Require two-factor authentication', example: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ description: 'Available 2FA methods', example: ['app', 'sms'], enum: ['app', 'sms', 'email'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  methods?: string[];

  @ApiProperty({ description: 'Enable backup codes', example: true })
  @IsOptional()
  @IsBoolean()
  backupCodes?: boolean;
}

class AuditSettingsDto {
  @ApiProperty({ description: 'Audit log retention in days', example: 90, minimum: 30, maximum: 2555 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(2555)
  retentionDays?: number;

  @ApiProperty({ description: 'Log failed login attempts', example: true })
  @IsOptional()
  @IsBoolean()
  logFailedLogins?: boolean;

  @ApiProperty({ description: 'Log data changes', example: true })
  @IsOptional()
  @IsBoolean()
  logDataChanges?: boolean;

  @ApiProperty({ description: 'Log admin actions', example: true })
  @IsOptional()
  @IsBoolean()
  logAdminActions?: boolean;
}

class UpdateSecuritySettingsDto {
  @ApiProperty({ description: 'Password policy settings', type: PasswordPolicyDto })
  @IsOptional()
  @IsObject()
  passwordPolicy?: PasswordPolicyDto;

  @ApiProperty({ description: 'Session policy settings', type: SessionPolicyDto })
  @IsOptional()
  @IsObject()
  sessionPolicy?: SessionPolicyDto;

  @ApiProperty({ description: 'IP restriction settings', type: IpRestrictionsDto })
  @IsOptional()
  @IsObject()
  ipRestrictions?: IpRestrictionsDto;

  @ApiProperty({ description: 'Two-factor authentication policy', type: TwoFactorPolicyDto })
  @IsOptional()
  @IsObject()
  twoFactorPolicy?: TwoFactorPolicyDto;

  @ApiProperty({ description: 'Audit settings', type: AuditSettingsDto })
  @IsOptional()
  @IsObject()
  auditSettings?: AuditSettingsDto;
}

class SecuritySettingsResponseDto {
  @ApiProperty({ description: 'Settings unique identifier' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Password policy configuration' })
  passwordPolicy: Record<string, any>;

  @ApiProperty({ description: 'Session policy configuration' })
  sessionPolicy: Record<string, any>;

  @ApiProperty({ description: 'IP restrictions configuration' })
  ipRestrictions: Record<string, any>;

  @ApiProperty({ description: 'Two-factor authentication policy' })
  twoFactorPolicy: Record<string, any>;

  @ApiProperty({ description: 'Audit settings configuration' })
  auditSettings: Record<string, any>;

  @ApiProperty({ description: 'Security score (0-100)' })
  securityScore: number;

  @ApiProperty({ description: 'Security recommendations' })
  recommendations: string[];

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: Date;
}

@ApiTags('Security Settings')
@ApiBearerAuth()
@Controller('api/organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecuritySettingsController {
  private readonly logger = new Logger(SecuritySettingsController.name);

  constructor(
    private readonly securitySettingsService: SecuritySettingsService,
  ) {}

  @Get('security')
  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({
    summary: 'Get organization security settings (Admin only)',
    description: 'Retrieve current security settings including password policies, session management, IP restrictions, and security score.'
  })
  @ApiResponse({
    status: 200,
    description: 'Security settings retrieved successfully',
    type: SecuritySettingsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async getSecuritySettings(
    @Request() req: any,
  ): Promise<SecuritySettingsResponseDto> {
    try {
      const organizationId = req.user.organizationId;

      this.logger.log(`Getting security settings for organization: ${organizationId}`);

      const settings = await this.securitySettingsService.getSecuritySettings(organizationId);

      return {
        id: settings.id,
        organizationId: settings.organizationId,
        passwordPolicy: settings.passwordPolicy,
        sessionPolicy: settings.sessionPolicy,
        ipRestrictions: settings.ipRestrictions,
        twoFactorPolicy: settings.twoFactorPolicy,
        auditSettings: settings.auditSettings,
        securityScore: settings.securityScore,
        recommendations: settings.recommendations,
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error getting security settings: ${error.message}`);
      
      if (error.message.includes('not found')) {
        throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        'Failed to retrieve security settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('security')
  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Update organization security settings (Admin only)',
    description: 'Update security settings including password policies, IP restrictions, and audit configurations. Automatically calculates security score.'
  })
  @ApiBody({
    type: UpdateSecuritySettingsDto,
    description: 'Security settings to update',
    examples: {
      passwordPolicy: {
        summary: 'Update password policy',
        value: {
          passwordPolicy: {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            maxAge: 60
          }
        }
      },
      ipRestrictions: {
        summary: 'Enable IP restrictions',
        value: {
          ipRestrictions: {
            enabled: true,
            allowedRanges: ['192.168.1.0/24', '10.0.0.0/8'],
            blockedRanges: ['192.168.1.100/32']
          }
        }
      },
      twoFactor: {
        summary: 'Enable two-factor authentication',
        value: {
          twoFactorPolicy: {
            required: true,
            methods: ['app', 'sms'],
            backupCodes: true
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Security settings updated successfully',
    type: SecuritySettingsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid settings data or IP format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async updateSecuritySettings(
    @Request() req: any,
    @Body() updateData: UpdateSecuritySettingsDto,
  ): Promise<SecuritySettingsResponseDto> {
    try {
      const organizationId = req.user.organizationId;
      const userId = req.user.id;

      this.logger.log(`Updating security settings for organization: ${organizationId}`, updateData);

      // Additional validation for IP restrictions
      if (updateData.ipRestrictions) {
        const { allowedRanges, blockedRanges } = updateData.ipRestrictions;
        
        if (allowedRanges) {
          for (const range of allowedRanges) {
            if (!this.isValidCIDR(range)) {
              throw new HttpException(
                `Invalid IP range format: ${range}. Use CIDR format (e.g., 192.168.1.0/24)`,
                HttpStatus.BAD_REQUEST,
              );
            }
          }
        }

        if (blockedRanges) {
          for (const range of blockedRanges) {
            if (!this.isValidCIDR(range)) {
              throw new HttpException(
                `Invalid IP range format: ${range}. Use CIDR format (e.g., 192.168.1.100/32)`,
                HttpStatus.BAD_REQUEST,
              );
            }
          }
        }
      }

      // Validate 2FA methods
      if (updateData.twoFactorPolicy?.methods) {
        const validMethods = ['app', 'sms', 'email'];
        const invalidMethods = updateData.twoFactorPolicy.methods.filter(
          method => !validMethods.includes(method)
        );
        
        if (invalidMethods.length > 0) {
          throw new HttpException(
            `Invalid 2FA methods: ${invalidMethods.join(', ')}. Valid methods: ${validMethods.join(', ')}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Validate session policy logic
      if (updateData.sessionPolicy) {
        const { sessionTimeout, idleTimeout } = updateData.sessionPolicy;
        
        if (sessionTimeout && idleTimeout && sessionTimeout > idleTimeout) {
          throw new HttpException(
            'Session timeout cannot be greater than idle timeout',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const settings = await this.securitySettingsService.updateSecuritySettings(
        organizationId,
        updateData,
        userId,
      );

      return {
        id: settings.id,
        organizationId: settings.organizationId,
        passwordPolicy: settings.passwordPolicy,
        sessionPolicy: settings.sessionPolicy,
        ipRestrictions: settings.ipRestrictions,
        twoFactorPolicy: settings.twoFactorPolicy,
        auditSettings: settings.auditSettings,
        securityScore: settings.securityScore,
        recommendations: settings.recommendations,
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error updating security settings: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.message.includes('not found')) {
        throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        'Failed to update security settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('security/recommendations')
  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({
    summary: 'Get security recommendations (Admin only)',
    description: 'Get personalized security recommendations based on current settings and industry best practices.'
  })
  @ApiResponse({
    status: 200,
    description: 'Security recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', example: 75 },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', example: 'Password Policy' },
              priority: { type: 'string', example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH'] },
              message: { type: 'string', example: 'Consider increasing minimum password length to 12 characters' },
              impact: { type: 'number', example: 5 }
            }
          }
        }
      }
    }
  })
  async getSecurityRecommendations(@Request() req: any) {
    try {
      const organizationId = req.user.organizationId;

      this.logger.log(`Getting security recommendations for organization: ${organizationId}`);

      const recommendations = await this.securitySettingsService.getSecurityRecommendations(organizationId);

      return recommendations;
    } catch (error) {
      this.logger.error(`Error getting security recommendations: ${error.message}`);
      
      throw new HttpException(
        'Failed to retrieve security recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('security/audit')
  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({
    summary: 'Get security audit summary (Admin only)',
    description: 'Get a summary of recent security events and audit logs.'
  })
  @ApiResponse({
    status: 200,
    description: 'Security audit summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        failedLogins: { type: 'number', example: 3 },
        successfulLogins: { type: 'number', example: 127 },
        passwordResets: { type: 'number', example: 5 },
        settingsChanges: { type: 'number', example: 2 },
        suspiciousActivity: { type: 'number', example: 1 },
        lastAudit: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getSecurityAuditSummary(@Request() req: any) {
    try {
      const organizationId = req.user.organizationId;

      this.logger.log(`Getting security audit summary for organization: ${organizationId}`);

      // This would connect to your audit logging system
      // For now, return mock data structure
      return {
        failedLogins: 3,
        successfulLogins: 127,
        passwordResets: 5,
        settingsChanges: 2,
        suspiciousActivity: 1,
        lastAudit: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting security audit summary: ${error.message}`);
      
      throw new HttpException(
        'Failed to retrieve security audit summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Utility method to validate CIDR format
  private isValidCIDR(cidr: string): boolean {
    const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:3[0-2]|[12]?[0-9])$/;
    return cidrRegex.test(cidr);
  }
}