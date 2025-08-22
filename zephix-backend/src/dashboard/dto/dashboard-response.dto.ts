export class ProjectSummaryDto {
  id: string;
  name: string;
  status: string;
  progress: number;
  dueDate?: Date;
  role: string;
}

export class RiskAlertDto {
  id: string;
  title: string;
  severity: string;
  status: string;
}

export class ActivityDto {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
}

export class DashboardStatsDto {
  totalProjects: number;
  activeProjects: number;
  risksIdentified: number;
  upcomingDeadlines: number;
}

export class DashboardResponseDto {
  myProjects: ProjectSummaryDto[];
  risksNeedingAttention: RiskAlertDto[];
  recentActivity: ActivityDto[];
  statistics: DashboardStatsDto;
}
