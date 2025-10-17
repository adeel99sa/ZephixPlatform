import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from 'typeorm';

@UseGuards(AuthGuard('jwt'))
@Controller('obs/db')
export class DbProbeController {
  constructor(private readonly ds: DataSource) {}

  @Get('ping')
  async ping() {
    const t0 = Date.now();
    const row = await this.ds.query('SELECT version(), NOW() as now');
    return {
      success: true,
      data: {
        version: row?.[0]?.version ?? 'unknown',
        now: row?.[0]?.now ?? null,
        latencyMs: Date.now() - t0,
      },
    };
  }

  @Get('entities')
  async entities() {
    const metas = this.ds.entityMetadatas.map((m) => ({
      name: m.name,
      table: m.tableName,
      columns: m.columns.map((c) => ({
        property: c.propertyName,
        database: c.databaseName,
        type: String(c.type),
        nullable: c.isNullable,
      })),
    }));
    return { success: true, data: metas };
  }
}
