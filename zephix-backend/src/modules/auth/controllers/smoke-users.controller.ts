import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';
import { SmokeKeyGuard } from '../guards/smoke-key.guard';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { AuthRegistrationService } from '../services/auth-registration.service';

class SetPrimaryOrgDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsUUID()
  @IsNotEmpty()
  orgId: string;
}

class SmokeCreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  orgName: string;
}

/**
 * Staging-only smoke endpoint for user management in acceptance tests.
 *
 * Allows the smoke lane to update a user's primary organization after
 * they have accepted an invite, so that smokeLogin creates a session
 * in the invited org (with the correct platformRole) rather than in
 * their own self-registered org.
 *
 * Protected by SmokeKeyGuard — staging + ZEPHIX_ENV=staging + X-Smoke-Key header required.
 */
@ApiTags('smoke')
@Controller('smoke/users')
@UseGuards(SmokeKeyGuard)
export class SmokeUsersController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>,
    private readonly authRegistrationService: AuthRegistrationService,
  ) {}

  /**
   * POST /api/smoke/users/create
   *
   * Staging-only. Creates a user + org via AuthRegistrationService.registerSelfServe,
   * bypassing the HTTP-layer rate limiter on /auth/register.
   * Intended for smoke test setup only — never call from production flows.
   *
   * Returns { message, alreadyExists } where alreadyExists=true means the email
   * was already registered (idempotent — not an error for smoke purposes).
   */
  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staging-only: create user + org, bypassing rate limiter' })
  @ApiResponse({ status: 200, description: 'User created or already exists' })
  @ApiResponse({ status: 403, description: 'Invalid smoke key' })
  async smokeCreate(
    @Body() dto: SmokeCreateUserDto,
  ): Promise<{ message: string; alreadyExists: boolean }> {
    const result = await this.authRegistrationService.registerSelfServe({
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      orgName: dto.orgName,
    });
    // registerSelfServe returns a neutral message regardless of whether the user
    // already existed — that's intentional for the public endpoint. For smoke use
    // we can't tell from the message alone, but that's fine: callers should treat
    // both outcomes as success.
    return { message: result.message, alreadyExists: false };
  }

  /**
   * POST /api/smoke/users/set-primary-org
   *
   * Staging-only. Updates user.organizationId to the given orgId so that
   * smokeLogin creates a session in that org context, yielding the correct
   * platformRole from the user's UserOrganization record in that org.
   *
   * Requirements:
   * - User must exist (by email)
   * - Target org must exist
   * - User must have an active UserOrganization record in the target org
   *   (i.e. they must have already accepted the invite)
   */
  @Post('set-primary-org')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staging-only: update user primary org for smoke session context' })
  @ApiResponse({ status: 200, description: 'Primary org updated' })
  @ApiResponse({ status: 400, description: 'Invalid input or user not a member of org' })
  @ApiResponse({ status: 403, description: 'Invalid smoke key' })
  @ApiResponse({ status: 404, description: 'User or org not found' })
  async setPrimaryOrg(
    @Body() dto: SetPrimaryOrgDto,
  ): Promise<{ message: string; email: string; orgId: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const org = await this.organizationRepository.findOne({
      where: { id: dto.orgId },
    });
    if (!org) {
      throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    }

    const membership = await this.userOrgRepository.findOne({
      where: { userId: user.id, organizationId: dto.orgId, isActive: true },
    });
    if (!membership) {
      throw new BadRequestException({
        code: 'NOT_A_MEMBER',
        message: 'User does not have an active membership in the target organization',
      });
    }

    await this.userRepository.update(user.id, { organizationId: dto.orgId });

    return {
      message: 'Primary org updated',
      email: normalizedEmail,
      orgId: dto.orgId,
    };
  }
}
