import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly config: ConfigService;

  constructor(configService: ConfigService) {
    const secret =
      configService.get<string>('jwt.secret') ??
      configService.get<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: configService.get<string>('jwt.iss') ?? 'zephix',
      audience: configService.get<string>('jwt.aud') ?? 'zephix-app',
    });

    this.config = configService;
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
