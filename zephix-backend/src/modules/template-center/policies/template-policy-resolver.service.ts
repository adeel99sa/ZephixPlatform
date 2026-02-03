import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface GateRequirements {
  requiredDocKeys: string[];
  requiredKpiKeys: string[];
  requiredDocStates: string[];
  requireAllKpis: boolean;
  templateKey: string;
  templateVersion: number;
}

@Injectable()
export class TemplatePolicyResolverService {
  constructor(private readonly dataSource: DataSource) {}

  async getGateRequirements(
    projectId: string,
    gateKey: string,
  ): Promise<GateRequirements> {
    const rows = await this.dataSource.query(
      `
      SELECT tv.version as template_version, tv.schema
      FROM template_lineage tl
      JOIN template_versions tv ON tv.id = tl.template_version_id
      WHERE tl.project_id = $1
      ORDER BY tl.applied_at DESC
      LIMIT 1
      `,
      [projectId],
    );

    if (!rows?.length) {
      throw new NotFoundException('template_not_applied');
    }

    const rawSchema = rows[0].schema;
    if (rawSchema !== null && typeof rawSchema !== 'object') {
      throw new InternalServerErrorException('Template schema is invalid or malformed');
    }
    const schema = rawSchema && typeof rawSchema === 'object' && !Array.isArray(rawSchema) ? rawSchema : {};
    const gates = schema.gates && typeof schema.gates === 'object' && !Array.isArray(schema.gates) ? schema.gates : {};
    if (!Object.prototype.hasOwnProperty.call(gates, gateKey)) {
      throw new NotFoundException(`Gate "${gateKey}" not found in template schema`);
    }
    const gate = gates[gateKey];
    const req = gate?.requirements && typeof gate.requirements === 'object' ? gate.requirements : {};

    return {
      requiredDocKeys: Array.isArray(req.requiredDocKeys) ? req.requiredDocKeys : [],
      requiredKpiKeys: Array.isArray(req.requiredKpiKeys) ? req.requiredKpiKeys : [],
      requiredDocStates:
        Array.isArray(req.requiredDocStates) && req.requiredDocStates.length > 0
          ? req.requiredDocStates
          : ['approved', 'completed'],
      requireAllKpis:
        typeof req.requireAllKpis === 'boolean' ? req.requireAllKpis : true,
      templateKey: typeof schema.templateKey === 'string' ? schema.templateKey : '',
      templateVersion: Number(rows[0].template_version ?? 1),
    };
  }
}
