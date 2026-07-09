import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceRuleSet } from './entities/governance-rule-set.entity';
import { GovernanceRule } from './entities/governance-rule.entity';
import { GovernanceRuleActiveVersion } from './entities/governance-rule-active-version.entity';
import { GovernanceEvaluation } from './entities/governance-evaluation.entity';
import { GovernanceException } from '../governance-exceptions/entities/governance-exception.entity';
import { Template } from '../templates/entities/template.entity';
import { WorkspaceGovPolicy } from './entities/workspace-gov-policy.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { GovernanceRuleResolverService } from './services/governance-rule-resolver.service';
import { GovernanceRuleEngineService } from './services/governance-rule-engine.service';
import { GovernanceRulesAdminService } from './services/governance-rules-admin.service';
import { GovernanceTemplateService } from './services/governance-template.service';
import { WorkspaceGovPoliciesService } from './services/workspace-gov-policies.service';
import { GovernanceRulesController } from './controllers/governance-rules.controller';
import { AdminGovernancePoliciesController } from './controllers/admin-governance-policies.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GovernanceRuleSet,
      GovernanceRule,
      GovernanceRuleActiveVersion,
      GovernanceEvaluation,
      GovernanceException,
      Template,
      WorkspaceGovPolicy,
      Workspace,
    ]),
  ],
  controllers: [GovernanceRulesController, AdminGovernancePoliciesController],
  providers: [
    GovernanceRuleResolverService,
    GovernanceRuleEngineService,
    GovernanceRulesAdminService,
    GovernanceTemplateService,
    WorkspaceGovPoliciesService,
  ],
  exports: [
    GovernanceRuleEngineService,
    GovernanceRulesAdminService,
    GovernanceRuleResolverService,
    GovernanceTemplateService,
    WorkspaceGovPoliciesService,
  ],
})
export class GovernanceRulesModule {}
