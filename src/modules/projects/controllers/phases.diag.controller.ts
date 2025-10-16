import {
  Controller, Get, Param, UseGuards, InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ProjectPhase } from '../entities/project-phase.entity';
import { Project } from '../entities/project.entity';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/phases/diag')
export class ProjectPhasesDiagController {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(ProjectPhase) private readonly phaseRepo: Repository<ProjectPhase>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  // 1) Raw SQL (bypasses TypeORM mappings)
  @Get('raw')
  async raw(@Param('projectId') projectId: string) {
    try {
      const rows = await this.ds.query(
        `SELECT id, name, "order", project_id, organization_id, workspace_id
         FROM project_phases
         WHERE project_id = $1
         ORDER BY "order" ASC`,
        [projectId],
      );
      return { ok: true, mode: 'raw', rows };
    } catch (e: any) {
      return { ok: false, mode: 'raw', error: e?.message, detail: String(e) };
    }
  }

  // 2) ORM probe (lets TypeORM generate SQL using entity mapping)
  @Get('orm')
  async orm(@Param('projectId') projectId: string) {
    try {
      const rows = await this.phaseRepo.find({
        where: { projectId },
        order: { order: 'ASC' },
      });
      return { ok: true, mode: 'orm', rows };
    } catch (e: any) {
      return { ok: false, mode: 'orm', error: e?.message, detail: String(e) };
    }
  }

  // 3) Entity metadata (columns that TypeORM thinks exist)
  @Get('meta')
  async meta() {
    try {
      const meta = this.ds.getMetadata(ProjectPhase);
      return {
        ok: true,
        table: meta.tableName,
        columns: meta.columns.map(c => ({
          property: c.propertyName,
          database: c.databasePath, // resolved column name
          type: c.type,
          isPrimary: c.isPrimary,
        })),
      };
    } catch (e: any) {
      return { ok: false, error: e?.message, detail: String(e) };
    }
  }
}
