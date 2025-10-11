import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('jwt.secret');
    console.log('JWT secret loaded?', Boolean(secret));
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // Support multiple payload formats for backward compatibility
    const id = payload?.sub ?? payload?.userId ?? payload?.id;
    if (!id) {
      throw new UnauthorizedException('Invalid token payload - missing user ID');
    }

    return {
      id,
      email: payload.email,
      role: payload.role,
      organizationRole: payload.organizationRole,
      organizationId: payload.organizationId ?? null,
      workspaceId: payload.workspaceId ?? null,
    };
  }
}
