import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/user.entity';

@Module({
  imports: [
    // Ensure entities required by AuthService live here
    TypeOrmModule.forFeature([User]),

    // Needed so downstream modules can use @UseGuards(AuthGuard('jwt'))
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),

    // Make env available here and everywhere else (if not already global)
    ConfigModule,

    // Jwt config comes ONLY from ConfigService (no inline secrets)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: cfg.get<string>('JWT_EXPIRES_IN') ?? '15m',
          issuer: cfg.get<string>('jwt.iss') ?? 'zephix',
          audience: cfg.get<string>('jwt.aud') ?? 'zephix-app',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,       // strategy must be provided here
    JwtAuthGuard,      // and the guard (class-based) if you inject it
  ],
  exports: [
    // Export everything downstream modules need to protect routes
    PassportModule,
    JwtModule,
    JwtStrategy,
    JwtAuthGuard,
    AuthService,
  ],
})
export class AuthModule {}
