import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doc } from './entities/doc.entity';
import { DocsService } from './docs.service';
import { DocsController } from './docs.controller';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { TenancyModule, createTenantAwareRepositoryProvider } from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Doc]),
    WorkspaceAccessModule,
    TenancyModule,
  ],
  controllers: [DocsController],
  providers: [
    DocsService,
    createTenantAwareRepositoryProvider(Doc),
  ],
  exports: [DocsService],
})
export class DocsModule {}
