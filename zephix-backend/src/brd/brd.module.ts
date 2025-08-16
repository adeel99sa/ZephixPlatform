import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BRD } from './entities/brd.entity';
import { BRDAnalysis } from './entities/brd-analysis.entity';
import { GeneratedProjectPlan } from './entities/generated-project-plan.entity';
import { BRDController } from './controllers/brd.controller';
import { BRDProjectPlanningController } from './controllers/brd-project-planning.controller';
import { BRDService } from './services/brd.service';
import { BRDAnalysisService } from './services/brd-analysis.service';
import { BRDRepository } from './repositories/brd.repository';
// AccessControlModule removed - using built-in NestJS guards instead
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { ObservabilityModule } from '../observability/observability.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    SharedModule, // Always import SharedModule for LLMProviderService and ClaudeService
    ObservabilityModule, // Provides MetricsService
    // Only import TypeORM when database is available AND connection is stable
    ...(process.env.DATABASE_URL ? (() => {
      try {
        console.log('🔍 BRDModule: Loading TypeORM entities...');
        return [TypeOrmModule.forFeature([
          BRD,
          BRDAnalysis,
          GeneratedProjectPlan,
          UserOrganization,
        ])];
      } catch (error) {
        console.error('❌ BRDModule: TypeORM loading failed:', error);
        console.warn('⚠️  BRDModule: Continuing without database entities');
        return [];
      }
    })() : []),
  ],
  controllers: [BRDController, BRDProjectPlanningController],
  providers: [BRDService, BRDAnalysisService, BRDRepository],
  exports: [BRDService, BRDAnalysisService, BRDRepository],
})
export class BRDModule {
  constructor() {
    try {
      console.log('🔍 BRDModule constructor executing');
      console.log('🔍 BRDModule controllers:', [BRDController, BRDProjectPlanningController]);
      console.log('🔍 BRDModule providers:', [BRDService, BRDAnalysisService, BRDRepository]);
      console.log('✅ BRDModule constructor completed successfully');
    } catch (error) {
      console.error('❌ CRITICAL ERROR in BRDModule constructor:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
}
