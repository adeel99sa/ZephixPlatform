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
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    UsersModule, // Add UsersModule for basic auth functionality
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {
  constructor() {
    try {
      console.log('🔐 AuthModule constructor executing');
      console.log('🔐 AuthModule controllers:', [AuthController]);
      console.log('🔐 AuthModule providers:', [AuthService, LocalStrategy, JwtStrategy]);
      console.log('🔐 AuthModule imports:', ['PassportModule', 'ConfigModule', 'UsersModule']);
      console.log('🔐 AuthModule exports:', [AuthService]);
      console.log('✅ AuthModule constructor completed successfully');
    } catch (error) {
      console.error('❌ CRITICAL ERROR in AuthModule constructor:', error);
      console.error('Stack trace:', error.stack);
      throw error; // Re-throw to prevent silent failures
    }
  }
}

// Separate module for when database is available
@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthDatabaseModule {}
