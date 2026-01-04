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
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';

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
    WorkspaceAccessModule, // Provides WorkspaceAccessService - breaks circular dependency with WorkspacesModule
    // SharedModule is @Global(), so ResponseService is available without import
  ],
  providers: [
    PortfoliosService,
    ProgramsService,
    // ResponseService available from @Global() SharedModule - no local provider needed
  ],
  controllers: [PortfoliosController, ProgramsController],
  exports: [PortfoliosService, ProgramsService],
})
export class PortfoliosModule {}
