/**
 * Seed prebuilt template definitions and one published version for Template Center.
 * Requires TEMPLATE_CENTER_SEED_OK=true.
 * Run: npm run template-center:seed:templates
 */
import { DataSource } from 'typeorm';
import { TemplateDefinition } from '../../modules/template-center/templates/entities/template-definition.entity';
import { TemplateVersion } from '../../modules/template-center/templates/entities/template-version.entity';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

function schemaHash(schema: object): string {
  const canonical = JSON.stringify(schema, Object.keys(schema).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

const TEMPLATES = [
  {
    templateKey: 'waterfall_standard',
    name: 'Waterfall Standard',
    description: 'Classic waterfall phases and gates',
    category: 'waterfall',
    kpis: [
      { kpi_key: 'spi', required: true },
      { kpi_key: 'cpi', required: true },
    ],
    documents: [
      {
        doc_key: 'project_charter',
        required: true,
        blocks_gate_key: 'gate_initiation',
      },
      {
        doc_key: 'project_plan',
        required: true,
        blocks_gate_key: 'gate_planning_approval',
      },
      {
        doc_key: 'project_schedule',
        required: true,
        blocks_gate_key: 'gate_planning_approval',
      },
    ],
  },
  {
    templateKey: 'agile_standard',
    name: 'Agile Standard',
    description: 'Agile delivery with sprints and velocity',
    category: 'agile',
    kpis: [
      { kpi_key: 'velocity', required: true },
      { kpi_key: 'burndown_remaining', required: false },
    ],
    documents: [
      { doc_key: 'project_charter', required: true },
      { doc_key: 'status_report', required: false },
      { doc_key: 'lessons_learned', required: false },
    ],
  },
];

async function run() {
  if (
    String(process.env.TEMPLATE_CENTER_SEED_OK || '').toLowerCase() !== 'true'
  ) {
    console.error('Set TEMPLATE_CENTER_SEED_OK=true to run this seed.');
    process.exit(1);
  }
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [TemplateDefinition, TemplateVersion],
    synchronize: false,
  });
  await ds.initialize();
  const defRepo = ds.getRepository(TemplateDefinition);
  const versionRepo = ds.getRepository(TemplateVersion);
  let created = 0;
  for (const t of TEMPLATES) {
    let def = await defRepo.findOne({
      where: { templateKey: t.templateKey, scope: 'system' },
    });
    if (!def) {
      def = await defRepo.save(
        defRepo.create({
          scope: 'system',
          orgId: null,
          workspaceId: null,
          templateKey: t.templateKey,
          name: t.name,
          description: t.description,
          category: t.category,
          isPrebuilt: true,
          isAdminDefault: false,
        }),
      );
      created++;
    }
    const schema: Record<string, unknown> = {
      templateKey: t.templateKey,
      name: t.name,
      version: 1,
      phases: [],
      gates:
        t.templateKey === 'waterfall_standard'
          ? {
              gate_planning_approval: {
                requirements: {
                  requiredDocKeys: ['project_plan', 'project_schedule'],
                  requiredKpiKeys: ['spi'],
                  requiredDocStates: ['approved', 'completed'],
                  requireAllKpis: true,
                },
              },
            }
          : {},
      tasks: [],
      kpis: t.kpis,
      documents: t.documents,
      policies: [],
    };
    const hash = schemaHash(schema);
    const existingVersion = await versionRepo.findOne({
      where: { templateDefinitionId: def.id, version: 1 },
    });
    if (!existingVersion) {
      await versionRepo.save(
        versionRepo.create({
          templateDefinitionId: def.id,
          version: 1,
          status: 'published',
          publishedAt: new Date(),
          publishedBy: null,
          schema,
          hash,
        }),
      );
    }
  }
  console.log(
    `Template Center prebuilt templates: ${created} definitions created/updated.`,
  );
  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
