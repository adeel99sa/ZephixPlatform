/**
 * Seed KPI definitions for Template Center.
 * Requires TEMPLATE_CENTER_SEED_OK=true.
 * Run: npm run template-center:seed:kpis
 */
import { DataSource } from 'typeorm';
import { KpiDefinition } from '../../modules/template-center/kpis/entities/kpi-definition.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const KPIS = [
  {
    kpiKey: 'spi',
    name: 'Schedule Performance Index',
    category: 'schedule',
    unit: 'ratio',
    direction: 'higher_better',
    rollupMethod: 'avg',
    timeWindow: 'trailing_30d',
  },
  {
    kpiKey: 'cpi',
    name: 'Cost Performance Index',
    category: 'cost',
    unit: 'ratio',
    direction: 'higher_better',
    rollupMethod: 'avg',
    timeWindow: 'trailing_30d',
  },
  {
    kpiKey: 'ev',
    name: 'Earned Value',
    category: 'cost',
    unit: 'currency',
    direction: 'higher_better',
    rollupMethod: 'sum',
    timeWindow: 'current',
  },
  {
    kpiKey: 'ac',
    name: 'Actual Cost',
    category: 'cost',
    unit: 'currency',
    direction: 'lower_better',
    rollupMethod: 'sum',
    timeWindow: 'current',
  },
  {
    kpiKey: 'pv',
    name: 'Planned Value',
    category: 'schedule',
    unit: 'currency',
    direction: 'higher_better',
    rollupMethod: 'sum',
    timeWindow: 'current',
  },
  {
    kpiKey: 'eac',
    name: 'Estimate at Completion',
    category: 'cost',
    unit: 'currency',
    direction: 'lower_better',
    rollupMethod: 'last',
    timeWindow: 'current',
  },
  {
    kpiKey: 'variance_at_completion',
    name: 'Variance at Completion',
    category: 'cost',
    unit: 'currency',
    direction: 'target_best',
    rollupMethod: 'last',
    timeWindow: 'current',
  },
  {
    kpiKey: 'risk_count_high',
    name: 'High Risk Count',
    category: 'risk',
    unit: 'count',
    direction: 'lower_better',
    rollupMethod: 'count',
    timeWindow: 'current',
  },
  {
    kpiKey: 'utilization',
    name: 'Resource Utilization',
    category: 'resource',
    unit: 'percent',
    direction: 'target_best',
    rollupMethod: 'avg',
    timeWindow: 'trailing_14d',
  },
  {
    kpiKey: 'velocity',
    name: 'Sprint Velocity',
    category: 'agile',
    unit: 'points',
    direction: 'higher_better',
    rollupMethod: 'sum',
    timeWindow: 'by_sprint',
  },
  {
    kpiKey: 'burndown_remaining',
    name: 'Burndown Remaining',
    category: 'agile',
    unit: 'points',
    direction: 'lower_better',
    rollupMethod: 'last',
    timeWindow: 'by_sprint',
  },
  {
    kpiKey: 'cycle_time_days',
    name: 'Cycle Time (days)',
    category: 'agile',
    unit: 'days',
    direction: 'lower_better',
    rollupMethod: 'p50',
    timeWindow: 'trailing_30d',
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
    entities: [KpiDefinition],
    synchronize: false,
  });
  await ds.initialize();
  const repo = ds.getRepository(KpiDefinition);
  let created = 0;
  for (const k of KPIS) {
    const existing = await repo.findOne({ where: { kpiKey: k.kpiKey } });
    if (!existing) {
      await repo.save(repo.create({ ...k, isActive: true }));
      created++;
    }
  }
  console.log(
    `Template Center KPIs: ${created} created, ${KPIS.length - created} already existed.`,
  );
  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
