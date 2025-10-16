import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret =
      config.get<string>('jwt.secret') ??
      config.get<string>('JWT_SECRET');

    if (!secret) throw new Error('JWT_SECRET is not configured');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: config.get<string>('jwt.iss') ?? 'zephix',
      audience: config.get<string>('jwt.aud') ?? 'zephix-app',
    });
  }

  async validate(payload: any) {
    // console.log('🎯 [JwtStrategy VALIDATE CALLED] keys:', Object.keys(payload));
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  }
}
