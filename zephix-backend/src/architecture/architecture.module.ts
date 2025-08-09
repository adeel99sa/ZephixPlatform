import { Module } from '@nestjs/common';
import { ArchitectureController } from './architecture.controller';
import { ArchitectureDerivationService } from './architecture-derivation.service';
import { SharedModule } from '../shared/shared.module';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [
    SharedModule,
    ObservabilityModule,
  ],
  controllers: [ArchitectureController],
  providers: [ArchitectureDerivationService],
  exports: [ArchitectureDerivationService],
})
export class ArchitectureModule {}
