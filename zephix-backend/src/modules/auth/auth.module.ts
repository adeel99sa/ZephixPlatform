import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DebugController } from './debug.controller';
import { User } from '../users/entities/user.entity';  // Fixed path
import { Organization } from '../../organizations/entities/organization.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Folder } from '../folders/entities/folder.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization, Workspace, Folder]),
    PassportModule,
    // JwtModule removed - using global registration from AppModule
  ],
  controllers: [AuthController, DebugController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}