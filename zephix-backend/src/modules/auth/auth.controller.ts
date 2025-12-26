/**
 * ROLE MAPPING SUMMARY:
 * - /auth/me returns same shape as login: { role, platformRole, permissions }
 * - Both endpoints use buildUserResponse() helper for consistency
 * - Role resolution: UserOrganization.role (primary) → User.role (fallback)
 */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { normalizePlatformRole } from '../../shared/enums/platform-roles.enum';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
  ) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: AuthRequest) {
    // Fetch full user from database to return complete user object
    const { userId } = getAuthContext(req);
    const user = await this.authService.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Load UserOrganization record for the current user and organization
    let orgRole: string | null = null;
    if (user.organizationId) {
      const userOrg = await this.userOrgRepository.findOne({
        where: {
          userId: user.id,
          organizationId: user.organizationId,
          isActive: true,
        },
      });
      if (userOrg) {
        orgRole = userOrg.role;
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[AuthController] No UserOrganization record found for user ${user.email} in org ${user.organizationId}. Falling back to user.role`,
        );
      }
    }

    // Use the same helper as login to ensure consistent structure
    // Pass the org role explicitly
    return this.authService.buildUserResponse(user, orgRole);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: AuthRequest) {
    const { userId } = getAuthContext(req);
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  async refreshToken(@Request() req, @Body() body: { refreshToken: string }) {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.refreshToken(body.refreshToken, ip, userAgent);
  }
}
