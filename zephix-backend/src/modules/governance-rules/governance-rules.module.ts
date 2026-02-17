import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceRuleSet } from './entities/governance-rule-set.entity';
import { GovernanceRule } from './entities/governance-rule.entity';
import { GovernanceRuleActiveVersion } from './entities/governance-rule-active-version.entity';
import { GovernanceEvaluation } from './entities/governance-evaluation.entity';
import { GovernanceRuleResolverService } from './services/governance-rule-resolver.service';
import { GovernanceRuleEngineService } from './services/governance-rule-engine.service';
import { GovernanceRulesAdminService } from './services/governance-rules-admin.service';
import { GovernanceRulesController } from './controllers/governance-rules.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GovernanceRuleSet,
      GovernanceRule,
      GovernanceRuleActiveVersion,
      GovernanceEvaluation,
    ]),
  ],
  controllers: [GovernanceRulesController],
  providers: [
    GovernanceRuleResolverService,
    GovernanceRuleEngineService,
    GovernanceRulesAdminService,
  ],
  exports: [GovernanceRuleEngineService, GovernanceRulesAdminService],
})
export class GovernanceRulesModule {}
