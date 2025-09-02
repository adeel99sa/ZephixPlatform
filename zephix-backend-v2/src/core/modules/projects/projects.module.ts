import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Task } from './entities/task.entity';
import { ProjectsService } from './services/projects.service';
import { ProjectsController } from './controllers/projects.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Task])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
