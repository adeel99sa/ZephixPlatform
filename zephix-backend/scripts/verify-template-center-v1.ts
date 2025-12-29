import 'reflect-metadata';
import * as dotenv from 'dotenv';
import AppDataSource from '../src/config/data-source';

dotenv.config();

interface VerificationResult {
  pass: boolean;
  errors: string[];
  checks: {
    coreTables: { pass: boolean; missing: string[] };
    templateTables: { pass: boolean; missing: string[] };
    templateColumns: { pass: boolean; missing: string[] };
    legoBlockColumns: { pass: boolean; missing: string[] };
    projectColumns: { pass: boolean; missing: string[] };
    dataIntegrity: {
      pass: boolean;
      templateCount: number;
      legoBlockCount: number;
      templateBlockCount: number;
      projectTemplatesWithOrg: number;
      projectTemplatesWithTemplateId: number;
      projectTemplatesMissingTemplateId: number;
      orgsWithMultipleDefaults: number;
      nonSystemTemplatesWithNullOrg: number;
    };
  };
}

async function verifyTemplateCenterV1(): Promise<VerificationResult> {
  const result: VerificationResult = {
    pass: true,
    errors: [],
    checks: {
      coreTables: { pass: false, missing: [] },
      templateTables: { pass: false, missing: [] },
      templateColumns: { pass: false, missing: [] },
      legoBlockColumns: { pass: false, missing: [] },
      projectColumns: { pass: false, missing: [] },
      dataIntegrity: {
        pass: false,
        templateCount: 0,
        legoBlockCount: 0,
        templateBlockCount: 0,
        projectTemplatesWithOrg: 0,
        projectTemplatesWithTemplateId: 0,
        projectTemplatesMissingTemplateId: 0,
        orgsWithMultipleDefaults: 0,
        nonSystemTemplatesWithNullOrg: 0,
      },
    },
  };

  try {
    await AppDataSource.initialize();
    const queryRunner = AppDataSource.createQueryRunner();

    // A. Core tables exist
    const coreTables = [
      'organizations',
      'users',
      'user_organizations',
      'workspaces',
      'projects',
    ];
    for (const table of coreTables) {
      const exists = await queryRunner.query(
        `SELECT to_regclass('${table}') as exists`,
      );
      if (!exists[0]?.exists) {
        result.checks.coreTables.missing.push(table);
      }
    }
    result.checks.coreTables.pass =
      result.checks.coreTables.missing.length === 0;

    // B. Template Center tables exist
    const templateTables = [
      'templates',
      'lego_blocks',
      'template_blocks',
    ];
    for (const table of templateTables) {
      const exists = await queryRunner.query(
        `SELECT to_regclass('${table}') as exists`,
      );
      if (!exists[0]?.exists) {
        result.checks.templateTables.missing.push(table);
      }
    }
    result.checks.templateTables.pass =
      result.checks.templateTables.missing.length === 0;

    // C. Column presence checks
    // templates columns
    const templateRequiredColumns = [
      'is_default',
      'lock_state',
      'created_by_id',
      'updated_by_id',
      'published_at',
      'archived_at',
      'organization_id',
      'metadata',
      'version',
    ];
    if (result.checks.templateTables.pass) {
      for (const col of templateRequiredColumns) {
        const exists = await queryRunner.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'templates' AND column_name = $1`,
          [col],
        );
        if (exists.length === 0) {
          result.checks.templateColumns.missing.push(col);
        }
      }
    }
    result.checks.templateColumns.pass =
      result.checks.templateColumns.missing.length === 0;

    // lego_blocks columns
    const legoBlockRequiredColumns = [
      'key',
      'surface',
      'is_active',
      'min_role_to_attach',
      'organization_id',
    ];
    if (result.checks.templateTables.pass) {
      for (const col of legoBlockRequiredColumns) {
        const exists = await queryRunner.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'lego_blocks' AND column_name = $1`,
          [col],
        );
        if (exists.length === 0) {
          result.checks.legoBlockColumns.missing.push(col);
        }
      }
    }
    result.checks.legoBlockColumns.pass =
      result.checks.legoBlockColumns.missing.length === 0;

    // projects columns
    const projectRequiredColumns = [
      'template_id',
      'template_version',
      'template_locked',
      'template_snapshot',
    ];
    if (result.checks.coreTables.pass) {
      for (const col of projectRequiredColumns) {
        const exists = await queryRunner.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'projects' AND column_name = $1`,
          [col],
        );
        if (exists.length === 0) {
          result.checks.projectColumns.missing.push(col);
        }
      }
    }
    result.checks.projectColumns.pass =
      result.checks.projectColumns.missing.length === 0;

    // D. Data integrity checks
    if (
      result.checks.templateTables.pass &&
      result.checks.coreTables.pass
    ) {
      // Counts
      const templateCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM templates`,
      );
      result.checks.dataIntegrity.templateCount =
        parseInt(templateCount[0]?.count || '0', 10);

      const legoBlockCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM lego_blocks`,
      );
      result.checks.dataIntegrity.legoBlockCount = parseInt(
        legoBlockCount[0]?.count || '0',
        10,
      );

      const templateBlockCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM template_blocks`,
      );
      result.checks.dataIntegrity.templateBlockCount = parseInt(
        templateBlockCount[0]?.count || '0',
        10,
      );

      // project_templates mapping coverage
      const ptWithOrg = await queryRunner.query(
        `SELECT COUNT(*) as count FROM project_templates WHERE organization_id IS NOT NULL`,
      );
      result.checks.dataIntegrity.projectTemplatesWithOrg = parseInt(
        ptWithOrg[0]?.count || '0',
        10,
      );

      const ptWithTemplateId = await queryRunner.query(
        `SELECT COUNT(*) as count FROM project_templates
         WHERE organization_id IS NOT NULL AND template_id IS NOT NULL`,
      );
      result.checks.dataIntegrity.projectTemplatesWithTemplateId = parseInt(
        ptWithTemplateId[0]?.count || '0',
        10,
      );

      const ptMissingTemplateId = await queryRunner.query(
        `SELECT COUNT(*) as count FROM project_templates
         WHERE organization_id IS NOT NULL AND template_id IS NULL`,
      );
      result.checks.dataIntegrity.projectTemplatesMissingTemplateId = parseInt(
        ptMissingTemplateId[0]?.count || '0',
        10,
      );

      // Defaults per org
      const orgsWithMultipleDefaults = await queryRunner.query(
        `SELECT organization_id, COUNT(*) as count
         FROM templates
         WHERE is_default = true AND organization_id IS NOT NULL
         GROUP BY organization_id
         HAVING COUNT(*) > 1`,
      );
      result.checks.dataIntegrity.orgsWithMultipleDefaults =
        orgsWithMultipleDefaults.length;

      // Non-system templates with null org
      const nonSystemNullOrg = await queryRunner.query(
        `SELECT COUNT(*) as count FROM templates
         WHERE organization_id IS NULL
         AND (metadata->>'isSystem')::boolean IS NOT TRUE`,
      );
      result.checks.dataIntegrity.nonSystemTemplatesWithNullOrg = parseInt(
        nonSystemNullOrg[0]?.count || '0',
        10,
      );
    }

    // Determine overall pass
    result.checks.dataIntegrity.pass =
      result.checks.dataIntegrity.orgsWithMultipleDefaults === 0 &&
      result.checks.dataIntegrity.nonSystemTemplatesWithNullOrg === 0;

    result.pass =
      result.checks.coreTables.pass &&
      result.checks.templateTables.pass &&
      result.checks.templateColumns.pass &&
      result.checks.legoBlockColumns.pass &&
      result.checks.projectColumns.pass &&
      result.checks.dataIntegrity.pass;

    if (!result.pass) {
      if (!result.checks.coreTables.pass) {
        result.errors.push(
          `Missing core tables: ${result.checks.coreTables.missing.join(', ')}`,
        );
      }
      if (!result.checks.templateTables.pass) {
        result.errors.push(
          `Missing template tables: ${result.checks.templateTables.missing.join(', ')}`,
        );
      }
      if (!result.checks.templateColumns.pass) {
        result.errors.push(
          `Missing template columns: ${result.checks.templateColumns.missing.join(', ')}`,
        );
      }
      if (!result.checks.legoBlockColumns.pass) {
        result.errors.push(
          `Missing lego_block columns: ${result.checks.legoBlockColumns.missing.join(', ')}`,
        );
      }
      if (!result.checks.projectColumns.pass) {
        result.errors.push(
          `Missing project columns: ${result.checks.projectColumns.missing.join(', ')}`,
        );
      }
      if (!result.checks.dataIntegrity.pass) {
        if (result.checks.dataIntegrity.orgsWithMultipleDefaults > 0) {
          result.errors.push(
            `${result.checks.dataIntegrity.orgsWithMultipleDefaults} organizations have multiple default templates`,
          );
        }
        if (result.checks.dataIntegrity.nonSystemTemplatesWithNullOrg > 0) {
          result.errors.push(
            `${result.checks.dataIntegrity.nonSystemTemplatesWithNullOrg} non-system templates have null organization_id`,
          );
        }
      }
    }

    await queryRunner.release();
    await AppDataSource.destroy();
  } catch (error) {
    result.pass = false;
    result.errors.push(`Verification failed: ${error.message}`);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }

  return result;
}

async function main() {
  const result = await verifyTemplateCenterV1();

  // JSON output
  console.log('\n=== JSON Output ===');
  console.log(JSON.stringify(result, null, 2));

  // Human readable summary
  console.log('\n=== Human Readable Summary ===');
  console.log(`Overall Status: ${result.pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('\nCore Tables:');
  console.log(
    `  ${result.checks.coreTables.pass ? '✅' : '❌'} All present${
      result.checks.coreTables.missing.length > 0
        ? ` (missing: ${result.checks.coreTables.missing.join(', ')})`
        : ''
    }`,
  );

  console.log('\nTemplate Center Tables:');
  console.log(
    `  ${result.checks.templateTables.pass ? '✅' : '❌'} All present${
      result.checks.templateTables.missing.length > 0
        ? ` (missing: ${result.checks.templateTables.missing.join(', ')})`
        : ''
    }`,
  );

  console.log('\nTemplate Columns:');
  console.log(
    `  ${result.checks.templateColumns.pass ? '✅' : '❌'} All present${
      result.checks.templateColumns.missing.length > 0
        ? ` (missing: ${result.checks.templateColumns.missing.join(', ')})`
        : ''
    }`,
  );

  console.log('\nLego Block Columns:');
  console.log(
    `  ${result.checks.legoBlockColumns.pass ? '✅' : '❌'} All present${
      result.checks.legoBlockColumns.missing.length > 0
        ? ` (missing: ${result.checks.legoBlockColumns.missing.join(', ')})`
        : ''
    }`,
  );

  console.log('\nProject Columns:');
  console.log(
    `  ${result.checks.projectColumns.pass ? '✅' : '❌'} All present${
      result.checks.projectColumns.missing.length > 0
        ? ` (missing: ${result.checks.projectColumns.missing.join(', ')})`
        : ''
    }`,
  );

  console.log('\nData Integrity:');
  console.log(
    `  ${result.checks.dataIntegrity.pass ? '✅' : '❌'} All checks passed`,
  );
  console.log(`  Templates: ${result.checks.dataIntegrity.templateCount}`);
  console.log(
    `  Lego Blocks: ${result.checks.dataIntegrity.legoBlockCount}`,
  );
  console.log(
    `  Template Blocks: ${result.checks.dataIntegrity.templateBlockCount}`,
  );
  console.log(
    `  Project Templates with Org: ${result.checks.dataIntegrity.projectTemplatesWithOrg}`,
  );
  console.log(
    `  Project Templates with Template ID: ${result.checks.dataIntegrity.projectTemplatesWithTemplateId}`,
  );
  console.log(
    `  Project Templates Missing Template ID: ${result.checks.dataIntegrity.projectTemplatesMissingTemplateId}`,
  );
  console.log(
    `  Orgs with Multiple Defaults: ${result.checks.dataIntegrity.orgsWithMultipleDefaults}`,
  );
  console.log(
    `  Non-System Templates with Null Org: ${result.checks.dataIntegrity.nonSystemTemplatesWithNullOrg}`,
  );

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach((error) => console.log(`  - ${error}`));
  }

  process.exit(result.pass ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

