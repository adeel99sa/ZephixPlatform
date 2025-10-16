import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('_meta')
export class MetaController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  info() {
    const secret =
      this.config.get<string>('jwt.secret') ??
      this.config.get<string>('JWT_SECRET') ??
      '';
    const secretHash = crypto.createHash('sha256').update(secret).digest('hex').slice(0, 12);

    return {
      app: 'zephix-backend',
      env: this.config.get<string>('NODE_ENV') ?? 'unknown',
      jwt: {
        iss: this.config.get<string>('jwt.iss') ?? 'zephix',
        aud: this.config.get<string>('jwt.aud') ?? 'zephix-app',
        expiresIn: this.config.get<string>('jwt.expiresIn') ?? '15m',
        secretHash, // safe fingerprint; not the secret
      },
      build: { sha: process.env.GIT_SHA ?? 'local' },
      ts: new Date().toISOString(),
    };
  }
}
