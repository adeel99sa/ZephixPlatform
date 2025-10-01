import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { InvitationService } from './services/invitation.service';
import { Invitation } from './entities/invitation.entity';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    UsersModule,
    ProjectsModule,
    WorkspacesModule,
  ],
  controllers: [AdminController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class AdminModule {}
