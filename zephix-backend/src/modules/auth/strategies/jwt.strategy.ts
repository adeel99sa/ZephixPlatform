import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
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

// Custom extractor: Try cookie first, then Authorization header (for backward compatibility)
const cookieOrBearerExtractor = (req: Request): string | null => {
  // First, try to get token from cookie (primary method)
  const cookieToken = req.cookies?.['zephix_session'];
  if (cookieToken) {
    return cookieToken;
  }
  
  // Fallback to Authorization header (for backward compatibility)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get('jwt.secret');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: cookieOrBearerExtractor,
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
