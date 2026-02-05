/**
 * Seed document templates for Template Center.
 * Requires TEMPLATE_CENTER_SEED_OK=true.
 * Run: npm run template-center:seed:docs
 */
import { DataSource } from 'typeorm';
import { DocTemplate } from '../../modules/template-center/documents/entities/doc-template.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const DOCS = [
  {
    docKey: 'project_charter',
    name: 'Project Charter',
    category: 'initiation',
    contentType: 'rich_text',
  },
  {
    docKey: 'stakeholder_register',
    name: 'Stakeholder Register',
    category: 'initiation',
    contentType: 'rich_text',
  },
  {
    docKey: 'business_case',
    name: 'Business Case',
    category: 'initiation',
    contentType: 'rich_text',
  },
  {
    docKey: 'project_plan',
    name: 'Project Plan',
    category: 'planning',
    contentType: 'rich_text',
  },
  {
    docKey: 'project_schedule',
    name: 'Project Schedule',
    category: 'planning',
    contentType: 'rich_text',
  },
  {
    docKey: 'risk_register',
    name: 'Risk Register',
    category: 'planning',
    contentType: 'rich_text',
  },
  {
    docKey: 'raid_log',
    name: 'RAID Log',
    category: 'planning',
    contentType: 'rich_text',
  },
  {
    docKey: 'status_report',
    name: 'Status Report',
    category: 'monitoring',
    contentType: 'rich_text',
  },
  {
    docKey: 'change_request',
    name: 'Change Request',
    category: 'change',
    contentType: 'form',
  },
  {
    docKey: 'lessons_learned',
    name: 'Lessons Learned',
    category: 'closure',
    contentType: 'rich_text',
  },
  {
    docKey: 'closure_report',
    name: 'Closure Report',
    category: 'closure',
    contentType: 'rich_text',
  },
  {
    docKey: 'handover_checklist',
    name: 'Handover Checklist',
    category: 'closure',
    contentType: 'form',
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
    entities: [DocTemplate],
    synchronize: false,
  });
  await ds.initialize();
  const repo = ds.getRepository(DocTemplate);
  let created = 0;
  for (const d of DOCS) {
    const existing = await repo.findOne({ where: { docKey: d.docKey } });
    if (!existing) {
      await repo.save(repo.create({ ...d, isActive: true }));
      created++;
    }
  }
  console.log(
    `Template Center doc templates: ${created} created, ${DOCS.length - created} already existed.`,
  );
  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
