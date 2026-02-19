import { Module } from '@nestjs/common';
import { MethodologyConfigValidatorService } from './services/methodology-config-validator.service';
import { MethodologyConfigResolverService } from './services/methodology-config-resolver.service';
import { MethodologyConstraintsService } from './services/methodology-constraints.service';
import { ProjectFromTemplateService } from './services/project-from-template.service';
import { MethodologyConfigSyncService } from './services/methodology-config-sync.service';

@Module({
  providers: [
    MethodologyConfigValidatorService,
    MethodologyConfigResolverService,
    MethodologyConstraintsService,
    ProjectFromTemplateService,
    MethodologyConfigSyncService,
  ],
  exports: [
    MethodologyConfigValidatorService,
    MethodologyConfigResolverService,
    MethodologyConstraintsService,
    ProjectFromTemplateService,
    MethodologyConfigSyncService,
  ],
})
export class MethodologyModule {}
