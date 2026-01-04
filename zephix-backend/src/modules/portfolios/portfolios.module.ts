import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Portfolio } from './entities/portfolio.entity';
import { PortfolioProject } from './entities/portfolio-project.entity';
import { Program } from '../programs/entities/program.entity';
import { Project } from '../projects/entities/project.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { ResourceConflict } from '../resources/entities/resource-conflict.entity';
import { Resource } from '../resources/entities/resource.entity';
import { PortfoliosService } from './services/portfolios.service';
import { ProgramsService } from '../programs/services/programs.service';
import { PortfoliosController } from './portfolios.controller';
import { ProgramsController } from './programs.controller';
import { TenancyModule } from '../tenancy/tenancy.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { forwardRef } from '@nestjs/common';
import { ResponseService } from '../../shared/services/response.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Portfolio,
      PortfolioProject,
      Program,
      Project,
      ResourceAllocation,
      ResourceConflict,
      Resource,
    ]),
    TenancyModule,
    // Removed SharedModule import to break circular dependency
    // Provide ResponseService locally instead
    forwardRef(() => WorkspacesModule), // Required for WorkspaceAccessService - use forwardRef to break cycle
  ],
  providers: [
    PortfoliosService,
    ProgramsService,
    ResponseService, // Provide locally to avoid circular dependency through SharedModule
  ],
  controllers: [PortfoliosController, ProgramsController],
  exports: [PortfoliosService, ProgramsService],
})
export class PortfoliosModule {}
