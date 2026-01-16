/**
 * PART 7: AI Assistant Module
 * Scaffolding for AI features - no UI chat, no model calls yet
 */
import { Module } from '@nestjs/common';
import { AIContextBuilderService } from './context/context-builder.service';
import { AIPolicyMatrixService } from './policy/policy-matrix.service';
import { AIActionRegistryService } from './actions/action-registry.service';

@Module({
  providers: [
    AIContextBuilderService,
    AIPolicyMatrixService,
    AIActionRegistryService,
  ],
  exports: [
    AIContextBuilderService,
    AIPolicyMatrixService,
    AIActionRegistryService,
  ],
})
export class AIModule {}
