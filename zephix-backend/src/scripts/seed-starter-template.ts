/**
 * Seed a minimal "Starter Template" for testing
 * Only runs when TEMPLATE_SEED=true to prevent accidental prod runs
 * Run with: TEMPLATE_SEED=true npm run seed:starter-template
 */

import { DataSource } from 'typeorm';
import AppDataSource from '../config/data-source';
import { ProjectTemplate } from '../modules/templates/entities/project-template.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../modules/users/entities/user.entity';

async function seedStarterTemplate() {
  if (process.env.TEMPLATE_SEED !== 'true') {
    console.log(
      '⚠️  TEMPLATE_SEED is not set to "true". Skipping template seed.',
    );
    console.log(
      '   To seed templates, run: TEMPLATE_SEED=true npm run seed:starter-template',
    );
    process.exit(0);
  }

  console.log('🌱 Seeding Starter Template...\n');

  let dataSource: DataSource;
  try {
    dataSource = await AppDataSource.initialize();
    console.log('✅ Database connection established\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  try {
    const templateRepository = dataSource.getRepository(ProjectTemplate);
    const orgRepository = dataSource.getRepository(Organization);
    const userRepository = dataSource.getRepository(User);

    // Find first organization
    const org = await orgRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!org) {
      console.error(
        '❌ No organization found. Please create an organization first.',
      );
      process.exit(1);
    }

    // Find first user in organization
    const user = await userRepository.findOne({
      where: { organizationId: org.id },
      order: { createdAt: 'ASC' },
    });

    if (!user) {
      console.error(
        '❌ No user found in organization. Please create a user first.',
      );
      process.exit(1);
    }

    // Check if Starter Template already exists
    const existing = await templateRepository.findOne({
      where: {
        name: 'Starter Template',
        organizationId: org.id,
      },
    });

    if (existing) {
      console.log('✅ Starter Template already exists. Skipping...');
      console.log(`   Template ID: ${existing.id}`);
      await dataSource.destroy();
      process.exit(0);
    }

    // Create minimal starter template
    const starterTemplate = templateRepository.create({
      name: 'Starter Template',
      description: 'A simple template to get started with project management',
      methodology: 'agile',
      organizationId: org.id,
      createdById: user.id,
      scope: 'organization',
      isActive: true,
      isSystem: false,
      isDefault: false,
      phases: [
        {
          name: 'Planning',
          description: 'Initial planning phase',
          order: 0,
          estimatedDurationDays: 3,
        },
        {
          name: 'Execution',
          description: 'Project execution phase',
          order: 1,
          estimatedDurationDays: 14,
        },
        {
          name: 'Review',
          description: 'Review and wrap-up',
          order: 2,
          estimatedDurationDays: 2,
        },
      ],
      taskTemplates: [
        {
          name: 'Project Kickoff',
          description: 'Initial project kickoff meeting',
          estimatedHours: 2,
          phaseOrder: 0,
          priority: 'high',
        },
        {
          name: 'Define Requirements',
          description: 'Document project requirements',
          estimatedHours: 8,
          phaseOrder: 0,
          priority: 'high',
        },
        {
          name: 'Execute Tasks',
          description: 'Work on project tasks',
          estimatedHours: 40,
          phaseOrder: 1,
          priority: 'high',
        },
        {
          name: 'Project Review',
          description: 'Review project outcomes',
          estimatedHours: 4,
          phaseOrder: 2,
          priority: 'medium',
        },
      ],
      availableKPIs: [],
      defaultEnabledKPIs: [],
    });

    const saved = await templateRepository.save(starterTemplate);

    // Count existing data for banner
    const workspaceRepo = dataSource.getRepository('Workspace' as any);
    const projectRepo = dataSource.getRepository('Project' as any);
    const templateCount = await templateRepository
      .count({ where: { organizationId: org.id } })
      .catch(() => 0);
    const workspaceCount = await workspaceRepo
      .count({ where: { organizationId: org.id } })
      .catch(() => 0);
    const projectCount = await projectRepo
      .count({ where: { organizationId: org.id } })
      .catch(() => 0);

    console.log('✅ Starter Template created successfully!');
    console.log(`   Template ID: ${saved.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 SEED BANNER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Organization: ${org.name} (${org.slug || org.id})`);
    console.log(`   Admin Email:  ${user.email}`);
    console.log(`   Templates:    ${templateCount}`);
    console.log(`   Workspaces:   ${workspaceCount}`);
    console.log(`   Projects:     ${projectCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed template:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seedStarterTemplate();
