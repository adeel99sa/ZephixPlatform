import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    console.log('🎯 [JwtStrategy LOADED]: file=', __filename);
    const fromCfg = configService.get('jwt.secret');
    const env = process.env.JWT_SECRET;
    console.log('🎯 [JwtStrategy SECRETS]: cfg(jwt.secret)=', !!fromCfg, 'env(JWT_SECRET)=', !!env);
    
    const secret = fromCfg || env;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log('🎯 [JwtStrategy VALIDATE CALLED]: keys=', Object.keys(payload || {}));
    
    if (!payload.sub || !payload.email) {
      console.log('🎯 [JwtStrategy VALIDATION FAILED]: missing sub or email');
      throw new UnauthorizedException('Invalid token payload');
    }

    console.log('🎯 [JwtStrategy VALIDATION SUCCESS]');
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  }
}
