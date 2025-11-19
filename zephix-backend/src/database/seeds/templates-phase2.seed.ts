import { DataSource } from 'typeorm';
import { ProjectTemplate } from '../../modules/templates/entities/project-template.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../modules/users/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

interface TemplateSeedData {
  name: string;
  category: string;
  methodology: string;
  description: string;
  taskTemplates?: Array<{
    name: string;
    description?: string;
    estimatedHours: number;
    phaseOrder?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }>;
  phases?: Array<{
    name: string;
    description?: string;
    order: number;
    estimatedDurationDays?: number;
  }>;
}

/**
 * Seed starter templates from JSON files for Phase 2.3
 * Idempotent: will not create duplicates if templates already exist
 */
export async function seedPhase2Templates(
  dataSource: DataSource,
): Promise<void> {
  const templateRepository = dataSource.getRepository(ProjectTemplate);
  const orgRepository = dataSource.getRepository(Organization);
  const userRepository = dataSource.getRepository(User);

  // Find or create a default organization for seeding
  // Use the first organization found, or create a test one
  let defaultOrg = await orgRepository.findOne({
    where: {},
    order: { createdAt: 'ASC' },
  });

  if (!defaultOrg) {
    console.log(
      '⚠️  No organization found. Creating a default organization for seeding...',
    );
    defaultOrg = orgRepository.create({
      name: 'Default Organization',
      slug: 'default-org',
    });
    defaultOrg = await orgRepository.save(defaultOrg);
  }

  // Find a user in the organization to use as createdById
  // Prefer admin users, fallback to any user
  let defaultUser = await userRepository.findOne({
    where: { organizationId: defaultOrg.id, role: 'admin' },
    order: { createdAt: 'ASC' },
  });

  if (!defaultUser) {
    defaultUser = await userRepository.findOne({
      where: { organizationId: defaultOrg.id },
      order: { createdAt: 'ASC' },
    });
  }

  // If still no user, use org ID as placeholder (nullable field)
  const createdById = defaultUser?.id || defaultOrg.id;

  console.log(
    `🌱 Seeding templates for organization: ${defaultOrg.name} (${defaultOrg.id})`,
  );
  if (defaultUser) {
    console.log(
      `   Using user as creator: ${defaultUser.email} (${defaultUser.id})`,
    );
  } else {
    console.log(
      `   ⚠️  No user found in organization, using org ID as placeholder for createdById`,
    );
  }

  // Load JSON files from seed-data/templates
  const seedDataDir = path.join(__dirname, '../../../seed-data/templates');
  const seedFiles = [
    'software.json',
    'marketing.json',
    'construction.json',
    'consulting.json',
    'general.json',
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const fileName of seedFiles) {
    const filePath = path.join(seedDataDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Seed file not found: ${filePath}`);
      continue;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const templateData: TemplateSeedData = JSON.parse(fileContent);

      // Check if template already exists (by name and organizationId)
      const existing = await templateRepository.findOne({
        where: {
          name: templateData.name,
          organizationId: defaultOrg.id,
        },
      });

      if (existing) {
        console.log(
          `⏭️  Template "${templateData.name}" already exists. Skipping...`,
        );
        skippedCount++;
        continue;
      }

      // Create template
      // Note: category field doesn't exist in entity, so we skip it
      const template = templateRepository.create({
        name: templateData.name,
        description: templateData.description,
        methodology: templateData.methodology as any,
        organizationId: defaultOrg.id,
        createdById: createdById,
        taskTemplates: templateData.taskTemplates || [],
        phases: templateData.phases || [],
        scope: 'organization',
        isActive: true,
        isSystem: false,
        isDefault: false,
      });

      await templateRepository.save(template);
      console.log(`✅ Created template: ${templateData.name}`);
      createdCount++;
    } catch (error) {
      console.error(`❌ Failed to seed template from ${fileName}:`, error);
    }
  }

  console.log(`\n📊 Seeding summary:`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${createdCount + skippedCount}`);
}
