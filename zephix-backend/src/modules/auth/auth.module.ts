import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DebugController } from './debug.controller';
import { User } from '../users/entities/user.entity';  // Fixed path
import { Organization } from '../../organizations/entities/organization.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET, // NO FALLBACK - remove || 'default-secret'
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController, DebugController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}