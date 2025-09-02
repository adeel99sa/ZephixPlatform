import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { MonitoringModule } from './core/monitoring/monitoring.module';
import { AuthModule } from './core/modules/auth/auth.module';
import { ProjectsModule } from './core/modules/projects/projects.module';
import { ResourcesModule } from './core/modules/resources/resources.module';
import { RisksModule } from './core/modules/risks/risks.module';
import { AIAssistantModule } from './core/modules/ai-assistant/ai-assistant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    MonitoringModule,
    AuthModule,
    ProjectsModule,
    ResourcesModule,
    RisksModule,
    AIAssistantModule,
  ],
})
export class AppModule {}
