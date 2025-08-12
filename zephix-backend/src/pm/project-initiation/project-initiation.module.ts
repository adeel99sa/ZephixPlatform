import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectInitiationController } from './project-initiation.controller';
import { ProjectInitiationService } from './project-initiation.service';
import { UserProject } from '../entities/user-project.entity';
import { ProjectStakeholder } from '../entities/project-stakeholder.entity';
import { ProjectRisk } from '../entities/project-risk.entity';
// AccessControlModule removed - using built-in NestJS guards instead

@Module({
  imports: [
    // AccessControlModule removed - using built-in NestJS guards instead
    TypeOrmModule.forFeature([
      UserProject,
      ProjectStakeholder,
      ProjectRisk,
    ]),
  ],
  controllers: [ProjectInitiationController],
  providers: [ProjectInitiationService],
  exports: [ProjectInitiationService],
})
export class ProjectInitiationModule {}
