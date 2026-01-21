/**
 * Example script demonstrating runWithTenant usage for non-request execution paths.
 *
 * This script generates a report for a specific organization's projects
 * using TenantAwareRepository, proving that tenant scoping works outside of HTTP requests.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/tenant-scoped-report.ts <organizationId>
 *
 * Output:
 *   Writes to docs/tenant-scoped-report-<orgId>.json
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { TenantContextService } from '../src/modules/tenancy/tenant-context.service';
import { TenantAwareRepository } from '../src/modules/tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../src/modules/tenancy/tenant-aware.repository';
import { Project } from '../src/modules/projects/entities/project.entity';
import * as fs from 'fs';
import * as path from 'path';

async function generateTenantReport(organizationId: string) {
  console.log(`📊 Generating tenant-scoped report for organization: ${organizationId}`);

  // Bootstrap NestJS app to get DI container
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false, // Suppress logs for script output
  });

  const tenantContextService = app.get<TenantContextService>(TenantContextService);
  const dataSource = app.get<DataSource>(DataSource);

  // Get TenantAwareRepository for Project
  // In a real scenario, you'd inject this, but for scripts we get it from the container
  const projectRepo = dataSource.getRepository(Project);
  const tenantAwareRepo = new TenantAwareRepository<Project>(
    projectRepo,
    tenantContextService,
    Project,
  );

    // Execute within tenant context using runWithTenant
    const report = await tenantContextService.runWithTenant(
      { organizationId },
      async () => {
        console.log('✅ Tenant context set, querying projects...');

        // Use TenantAwareRepository - automatically scoped to organizationId
        const projects = await tenantAwareRepo.find({
          order: { createdAt: 'DESC' },
          take: 100,
        });

        console.log(`📋 Found ${projects.length} projects`);

        // Verify all projects belong to the expected organization
        const allBelongToOrg = projects.every(
          (p) => p.organizationId === organizationId,
        );

        if (!allBelongToOrg) {
          throw new Error(
            '❌ Tenant isolation violation: Found project from different organization!',
          );
        }

        // Generate report data (deterministic - no timestamps in assertions)
        const reportData = {
          organizationId,
          projectCount: projects.length,
          projectIds: projects.map((p) => p.id).sort(), // Sorted for deterministic comparison
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            workspaceId: p.workspaceId,
          })),
          summary: {
            byStatus: projects.reduce((acc, p) => {
              acc[p.status] = (acc[p.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          },
        };

        return reportData;
      },
    );

  // Write report to smoke-proof-artifacts directory
  const artifactsDir = path.join(__dirname, '..', 'docs', 'smoke-proof-artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const outputPath = path.join(
    artifactsDir,
    `tenant-scoped-report-${organizationId}.json`,
  );

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`✅ Report written to: ${outputPath}`);
  console.log(`📊 Summary: ${report.projectCount} projects found`);

  await app.close();
  return report;
}

// Main execution - supports multiple organization IDs for proof
const organizationIds = process.argv.slice(2);

if (organizationIds.length === 0) {
  console.error(
    '❌ Usage: ts-node scripts/tenant-scoped-report.ts <organizationId1> [organizationId2]',
  );
  process.exit(1);
}

// Process each organization and verify isolation
Promise.all(organizationIds.map((orgId) => generateTenantReport(orgId)))
  .then((reports) => {
    console.log('✅ Script completed successfully');
    console.log(`📊 Processed ${reports.length} organizations`);

    // Verify tenant isolation: each report should only contain its org's data
    for (let i = 0; i < reports.length; i++) {
      for (let j = i + 1; j < reports.length; j++) {
        const reportI = reports[i];
        const reportJ = reports[j];

        // Verify no project IDs overlap between organizations
        const overlap = reportI.projectIds.filter((id) =>
          reportJ.projectIds.includes(id),
        );
        if (overlap.length > 0) {
          throw new Error(
            `❌ Tenant isolation violation: Projects ${overlap.join(', ')} appear in both org ${reportI.organizationId} and org ${reportJ.organizationId}`,
          );
        }

        console.log(
          `✅ Verified isolation: Org ${reportI.organizationId} (${reportI.projectCount} projects) vs Org ${reportJ.organizationId} (${reportJ.projectCount} projects)`,
        );
      }
    }

    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });



