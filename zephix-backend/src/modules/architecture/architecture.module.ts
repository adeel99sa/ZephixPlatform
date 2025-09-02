import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// AccessControlModule removed - using built-in NestJS guards instead
import { ArchitectureDerivationService } from './architecture-derivation.service';
import { ArchitectureController } from './architecture.controller';
import { AIModule } from '../ai-assistant/ai.module';
import { ObservabilityModule } from '../../observability/observability.module';

@Module({
  imports: [
    // AccessControlModule removed - using built-in NestJS guards instead
    TypeOrmModule.forFeature([]),
    AIModule, // Provides LLMProviderService
    ObservabilityModule, // Provides MetricsService
  ],
  controllers: [ArchitectureController],
  providers: [ArchitectureDerivationService],
  exports: [ArchitectureDerivationService],
})
export class ArchitectureModule {}
