/**
 * Wave 7: Seed 12 system templates into the `templates` table (single source of truth).
 *
 * Guarded by TEMPLATE_CENTER_SEED_OK=true.
 * Idempotent — skips templates that already exist by templateCode.
 * KPI bindings go into `template_kpis` which has FK to `templates(id)`.
 *
 * Run:
 *   TEMPLATE_CENTER_SEED_OK=true npx ts-node src/scripts/seed-system-templates.ts
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import AppDataSource from '../config/data-source';
import { Template } from '../modules/templates/entities/template.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../modules/users/entities/user.entity';
import { KpiDefinitionEntity } from '../modules/kpis/entities/kpi-definition.entity';
import { TemplateKpiEntity } from '../modules/kpis/entities/template-kpi.entity';
import { KPI_PACKS } from '../modules/kpis/engine/kpi-packs';
import { KPI_REGISTRY_DEFAULTS } from '../modules/kpis/engine/kpi-registry-defaults';
import { SYSTEM_TEMPLATE_DEFS } from '../modules/templates/data/system-template-definitions';

async function ensureKpiDefinitions(dataSource: DataSource): Promise<Map<string, string>> {
  const defRepo = dataSource.getRepository(KpiDefinitionEntity);
  const codeToIdMap = new Map<string, string>();

  for (const def of KPI_REGISTRY_DEFAULTS) {
    let entity = await defRepo.findOne({ where: { code: def.code } });
    if (!entity) {
      entity = defRepo.create({
        code: def.code,
        name: def.name,
        description: def.description,
        category: def.category,
        lifecyclePhase: def.lifecyclePhase,
        formulaType: def.formulaType,
        dataSources: def.dataSources,
        requiredGovernanceFlag: def.requiredGovernanceFlag,
        isLeading: def.isLeading,
        isLagging: def.isLagging,
        defaultEnabled: def.defaultEnabled,
        calculationStrategy: def.calculationStrategy,
        unit: def.unit,
        direction: def.direction,
        isSystem: true,
        isActive: true,
      });
      entity = await defRepo.save(entity);
    }
    codeToIdMap.set(def.code, entity.id);
  }

  return codeToIdMap;
}

async function bindKpiPack(
  dataSource: DataSource,
  templateId: string,
  packCode: string,
  codeToIdMap: Map<string, string>,
): Promise<number> {
  const pack = KPI_PACKS.find((p) => p.packCode === packCode);
  if (!pack) {
    console.warn(`  Pack "${packCode}" not found. Skipping KPI binding.`);
    return 0;
  }

  const tkRepo = dataSource.getRepository(TemplateKpiEntity);
  let created = 0;

  for (const binding of pack.bindings) {
    const defId = codeToIdMap.get(binding.kpiCode);
    if (!defId) {
      console.warn(`  KPI code "${binding.kpiCode}" not in registry. Skipping.`);
      continue;
    }

    const existing = await tkRepo.findOne({
      where: { templateId, kpiDefinitionId: defId },
    });
    if (existing) continue;

    await tkRepo.save(
      tkRepo.create({
        templateId,
        kpiDefinitionId: defId,
        isRequired: binding.isRequired,
        defaultTarget: binding.defaultTarget ?? null,
      }),
    );
    created++;
  }

  return created;
}

async function main() {
  if (process.env.TEMPLATE_CENTER_SEED_OK !== 'true') {
    console.log('TEMPLATE_CENTER_SEED_OK is not "true". Skipping seed.');
    console.log('   Run: TEMPLATE_CENTER_SEED_OK=true npx ts-node src/scripts/seed-system-templates.ts');
    process.exit(0);
  }

  console.log('Wave 7: Seeding 12 system templates into `templates` table...\n');

  let dataSource: DataSource;
  try {
    dataSource = await AppDataSource.initialize();
    console.log('Database connected\n');
  } catch (error) {
    console.error('DB connection failed:', error);
    process.exit(1);
  }

  try {
    const templateRepo = dataSource.getRepository(Template);
    const orgRepo = dataSource.getRepository(Organization);
    const userRepo = dataSource.getRepository(User);

    const org = await orgRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (!org) {
      console.error('No organization found.');
      process.exit(1);
    }

    const user = await userRepo.findOne({
      where: { organizationId: org.id },
      order: { createdAt: 'ASC' },
    });
    if (!user) {
      console.error('No user found.');
      process.exit(1);
    }

    console.log(`   Org: ${org.name} (${org.id})`);
    console.log(`   User: ${user.email}\n`);

    console.log('Ensuring KPI definitions...');
    const codeToIdMap = await ensureKpiDefinitions(dataSource);
    console.log(`   ${codeToIdMap.size} definitions ready\n`);

    let created = 0;
    let existing = 0;

    for (const def of SYSTEM_TEMPLATE_DEFS) {
      const found = await templateRepo.findOne({
        where: [
          { templateCode: def.code },
          { name: def.name, isSystem: true },
        ],
      });

      if (found) {
        if (!found.templateCode) {
          await templateRepo.update(found.id, { templateCode: def.code });
          console.log(`"${def.name}" — backfilled templateCode="${def.code}"`);
        } else {
          console.log(`"${def.name}" already exists (${found.id}). Ensuring KPI pack...`);
        }
        const bound = await bindKpiPack(dataSource, found.id, def.packCode, codeToIdMap);
        console.log(`   KPI pack "${def.packCode}": ${bound} new bindings\n`);
        existing++;
        continue;
      }

      const template = templateRepo.create({
        name: def.name,
        templateCode: def.code,
        description: def.description,
        methodology: def.methodology as any,
        deliveryMethod: def.deliveryMethod,
        organizationId: null,
        createdById: user.id,
        templateScope: 'SYSTEM',
        isActive: true,
        isSystem: true,
        isDefault: false,
        isPublished: true,
        phases: def.phases as any,
        taskTemplates: def.taskTemplates as any,
        riskPresets: (def.riskPresets as any) || [],
        defaultTabs: def.defaultTabs,
        defaultGovernanceFlags: def.defaultGovernanceFlags,
        workTypeTags: def.workTypeTags,
      });

      const saved = await templateRepo.save(template);
      console.log(`Created "${def.name}" [${def.code}] (${saved.id})`);

      const bound = await bindKpiPack(dataSource, saved.id, def.packCode, codeToIdMap);
      console.log(`   KPI pack "${def.packCode}": ${bound} bindings\n`);
      created++;
    }

    console.log(`\nSystem template seed complete: ${created} created, ${existing} already existed.\n`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

main();
