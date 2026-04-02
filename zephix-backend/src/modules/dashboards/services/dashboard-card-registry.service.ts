import { Injectable } from '@nestjs/common';
import {
  DASHBOARD_CARD_DEFINITIONS,
  DEFAULT_HOME_CARD_KEYS,
  DEFAULT_WORKSPACE_CARD_KEYS,
} from '../dashboard-card-definition';
import {
  DashboardCardCategory,
  DashboardCardDefinition,
  DashboardCardKey,
  DashboardScopeType,
} from '../dashboard-card-types';

@Injectable()
export class DashboardCardRegistryService {
  getCardDefinitions(): DashboardCardDefinition[] {
    return DASHBOARD_CARD_DEFINITIONS;
  }

  getCardDefinition(cardKey: DashboardCardKey): DashboardCardDefinition {
    const found = DASHBOARD_CARD_DEFINITIONS.find((item) => item.cardKey === cardKey);
    if (!found) {
      throw new Error(`Unknown dashboard card key: ${cardKey}`);
    }
    return found;
  }

  getDefaultCardKeys(scopeType: DashboardScopeType): DashboardCardKey[] {
    if (scopeType === 'home') {
      return DEFAULT_HOME_CARD_KEYS;
    }
    if (scopeType === 'workspace') {
      return DEFAULT_WORKSPACE_CARD_KEYS;
    }
    return [];
  }

  getCatalogGroupedByCategory(
    scopeType: DashboardScopeType,
  ): Record<DashboardCardCategory, DashboardCardDefinition[]> {
    const grouped: Record<DashboardCardCategory, DashboardCardDefinition[]> = {
      featured: [],
      tasks: [],
      'project-health': [],
      resources: [],
      governance: [],
      'ai-insights': [],
    };
    for (const definition of DASHBOARD_CARD_DEFINITIONS) {
      if (!definition.supportedScopes.includes(scopeType)) {
        continue;
      }
      grouped[definition.category].push(definition);
    }
    return grouped;
  }
}

