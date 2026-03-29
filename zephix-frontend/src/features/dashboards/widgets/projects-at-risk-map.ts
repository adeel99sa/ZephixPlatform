import type { ProjectHealthItem } from '../analytics-api';
import type { ProjectsAtRiskRow, ProjectsAtRiskWidgetData } from './projects-at-risk-data';

function riskLevelFromHealth(p: ProjectHealthItem): 'critical' | 'warning' | 'healthy' {
  const high = p.riskLevel === 'HIGH' || p.riskLevel === 'high';
  if (high || (p.conflictCount && p.conflictCount > 0)) {
    return high ? 'critical' : 'warning';
  }
  return 'healthy';
}

/**
 * Maps current project-health analytics rows into the richer at-risk widget shape.
 * SPI/CPI/daysOverdue/primaryRisk populate when the dedicated dashboard endpoint exists.
 */
export function mapProjectHealthToAtRisk(items: ProjectHealthItem[]): ProjectsAtRiskWidgetData {
  const rows: ProjectsAtRiskRow[] = items.map((p) => ({
    id: p.projectId,
    name: p.projectName,
    riskLevel: riskLevelFromHealth(p),
    spi: null,
    cpi: null,
    daysOverdue: 0,
    blockedProjects: [],
    primaryRisk:
      p.conflictCount > 0
        ? `${p.conflictCount} open conflict${p.conflictCount > 1 ? 's' : ''}`
        : p.riskLevel === 'HIGH' || p.riskLevel === 'high'
          ? 'Elevated project risk'
          : null,
  }));

  const atRisk = rows.filter((r) => r.riskLevel !== 'healthy');

  return {
    totalProjects: items.length,
    atRiskCount: atRisk.length,
    projects: atRisk,
  };
}
