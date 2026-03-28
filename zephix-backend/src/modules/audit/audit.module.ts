import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from './entities/audit-event.entity';
import { AuditService } from './services/audit.service';
import { AuditController } from './controllers/audit.controller';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';

/**
 * Phase 3B: Global audit module.
 * @Global so AuditService is injectable everywhere without explicit imports.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditEvent]),
    WorkspaceAccessModule,
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
