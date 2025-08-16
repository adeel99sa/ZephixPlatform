import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from "../../modules/users/entities/user.entity"
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // Conditionally import TypeORM features based on database availability
    ...(process.env.SKIP_DATABASE !== 'true' ? [
      TypeOrmModule.forFeature([User, RefreshToken]),
      UsersModule,
    ] : []),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
