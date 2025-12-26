import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../../../common/http/auth-request';

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  platformRole?: string;
  organizationId?: string;
  workspaceId?: string;
  roles?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get('jwt.secret');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return exact AuthUser shape - keep payload small
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      platformRole: payload.platformRole || payload.role,
      organizationId: payload.organizationId,
      workspaceId: payload.workspaceId,
      roles: payload.roles ?? [],
    };
  }
}
