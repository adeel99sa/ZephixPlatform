import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceRuleSet } from './entities/governance-rule-set.entity';
import { GovernanceRule } from './entities/governance-rule.entity';
import { GovernanceRuleActiveVersion } from './entities/governance-rule-active-version.entity';
import { GovernanceEvaluation } from './entities/governance-evaluation.entity';
import { Template } from '../templates/entities/template.entity';
import { GovernanceRuleResolverService } from './services/governance-rule-resolver.service';
import { GovernanceRuleEngineService } from './services/governance-rule-engine.service';
import { GovernanceRulesAdminService } from './services/governance-rules-admin.service';
import { GovernanceTemplateService } from './services/governance-template.service';
import { GovernanceRulesController } from './controllers/governance-rules.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GovernanceRuleSet,
      GovernanceRule,
      GovernanceRuleActiveVersion,
      GovernanceEvaluation,
      Template,
    ]),
  ],
  controllers: [GovernanceRulesController],
  providers: [
    GovernanceRuleResolverService,
    GovernanceRuleEngineService,
    GovernanceRulesAdminService,
    GovernanceTemplateService,
  ],
  exports: [
    GovernanceRuleEngineService,
    GovernanceRulesAdminService,
    GovernanceRuleResolverService,
    GovernanceTemplateService,
  ],
})
export class GovernanceRulesModule {}
