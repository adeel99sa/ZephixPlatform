import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Task } from '../tasks/entities/task.entity';
import { CommandService } from './services/command.service';
import { CommandController } from './controllers/command.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Resource, Task])],
  controllers: [CommandController],
  providers: [CommandService],
  exports: [CommandService],
})
export class CommandModule {}
