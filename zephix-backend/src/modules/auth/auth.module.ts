import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OrganizationSignupController } from './controllers/organization-signup.controller';
import { OrganizationSignupService } from './services/organization-signup.service';
import { User } from '../users/entities/user.entity'; // Fixed path
import { Organization } from '../../organizations/entities/organization.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization, UserOrganization]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, OrganizationSignupController],
  providers: [AuthService, JwtStrategy, OrganizationSignupService],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
