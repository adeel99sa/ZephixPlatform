import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ObservabilityModule } from './observability/observability.module';
import { SharedModule } from './shared/shared.module';

/**
 * AppModule - Enterprise Application Root
 * 
 * Implements microservices-ready modular architecture with proper dependency
 * management and service boundaries. All modules depend on CoreModule for
 * essential services, ensuring proper startup order and health monitoring.
 */
@Module({
  imports: [
    // Phase 1: Core Foundation (Always loaded, no dependencies)
    CoreModule, // Provides ConfigModule, DatabaseService, HealthService globally
    
    // Phase 2: Essential Services (Depend on core modules)
    ObservabilityModule, // Provides MetricsService
    HealthModule, // Provides health endpoints
    
    // Phase 3: Authentication (Critical for MVP, depends on core modules)
    AuthModule, // Provides authentication endpoints
    
    // Phase 4: Feature Modules (Depend on core modules)
    SharedModule, // Provides LLMProviderService, ClaudeService, EmailService
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {
  constructor() {
    try {
      console.log('🏗️  AppModule constructor executing - Enterprise architecture');
      console.log('📋 Module import order: CoreModule → ObservabilityModule → HealthModule → AuthModule → SharedModule');
      console.log('✅ AppModule constructor completed successfully');
    } catch (error) {
      console.error('❌ CRITICAL ERROR in AppModule constructor:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
}
