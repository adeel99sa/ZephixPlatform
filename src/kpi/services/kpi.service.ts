import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class KPIService {
  private readonly logger = new Logger(KPIService.name);
  constructor(private readonly ds: DataSource) {}

  async getPortfolioKPIs() {
    try {
      // Prefer robust raw SQL to start; move to ORM after verified schema
      const [{ total_projects }] =
        await this.ds.query('SELECT COUNT(*)::int AS total_projects FROM projects');
      const [{ active_projects }] =
        await this.ds.query("SELECT COUNT(*)::int AS active_projects FROM projects WHERE status = 'active'");

      return {
        totalProjects: total_projects ?? 0,
        activeProjects: active_projects ?? 0,
        resourceUtilization: 0,
        budgetVariance: 0,
        conflictsPrevented: 0,
      };
    } catch (e: any) {
      this.logger.warn('DB issue in KPIService.getPortfolioKPIs', e?.message ?? String(e));
      throw e; // controller converts to safe payload
    }
  }
}
