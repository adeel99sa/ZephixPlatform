import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ImporterController } from './importer.controller';
import { CsvAnalyzeService } from './services/csv-analyze.service';
import { CsvExecuteService } from './services/csv-execute.service';
import { FileTokenService } from './services/file-token.service';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { ProjectStatus } from '../work-management/entities/project-status.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    // memoryStorage: file stays in memory as buffer (no disk write from multer side)
    MulterModule.register({ storage: undefined }),
    TypeOrmModule.forFeature([WorkTask, ProjectStatus, Project, User]),
    WorkspaceAccessModule,
  ],
  controllers: [ImporterController],
  providers: [CsvAnalyzeService, CsvExecuteService, FileTokenService],
})
export class ImporterModule {}
