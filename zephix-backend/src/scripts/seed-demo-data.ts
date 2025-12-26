/**
 * Demo Data Seed Script
 * Creates 1 workspace and 1 project if none exist when DEMO_BOOTSTRAP=true
 *
 * Run with: npm run seed:demo
 * Or set DEMO_BOOTSTRAP=true in your .env
 */

import { DataSource } from 'typeorm';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import {
  Project,
  ProjectStatus,
} from '../modules/projects/entities/project.entity';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

async function seedDemoData() {
  // Fail fast: Check preconditions
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is required but not set');
    process.exit(1);
  }

  // Only run in demo/bootstrap mode
  if (process.env.DEMO_BOOTSTRAP !== 'true') {
    if (process.env.NODE_ENV === 'production') {
      console.log(
        '⏭️  Skipping demo seed - DEMO_BOOTSTRAP not enabled in production',
      );
      return;
    }
    console.log('⏭️  Skipping demo seed - DEMO_BOOTSTRAP not set to "true"');
    return;
  }

  console.log('🌱 Seeding demo data (workspace + project)...\n');

  // Initialize database connection
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Workspace, Project, User, Organization, UserOrganization],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const workspaceRepo = dataSource.getRepository(Workspace);
    const projectRepo = dataSource.getRepository(Project);
    const userRepo = dataSource.getRepository(User);
    const orgRepo = dataSource.getRepository(Organization);
    const userOrgRepo = dataSource.getRepository(UserOrganization);

    // Find or create demo organization
    let org = await orgRepo.findOne({ where: { name: 'Demo Organization' } });
    if (!org) {
      // Try to find any existing org
      org = await orgRepo.findOne({});
      if (!org) {
        // Fail fast: DEMO_BOOTSTRAP requires org
        console.error('❌ DEMO_BOOTSTRAP=true but no organization found.');
        console.error('   Please run organization seed first.');
        process.exit(1);
      }
    }

    // Find admin user
    const adminUser = await userRepo.findOne({
      where: { email: 'admin@zephix.ai' },
    });

    if (!adminUser) {
      console.log('⚠️  Admin user not found. Please run user seed first.');
      return;
    }

    // Ensure user is in organization
    let userOrg = await userOrgRepo.findOne({
      where: {
        userId: adminUser.id,
        organizationId: org.id,
      },
    });

    if (!userOrg) {
      userOrg = userOrgRepo.create({
        userId: adminUser.id,
        organizationId: org.id,
        role: 'admin',
        isActive: true,
      });
      await userOrgRepo.save(userOrg);
      console.log('✅ Added admin user to organization\n');
    }

    // Check if workspace already exists
    const existingWorkspace = await workspaceRepo.findOne({
      where: { organizationId: org.id },
    });

    let workspace: Workspace;
    if (existingWorkspace) {
      console.log('✅ Workspace already exists, using existing workspace\n');
      workspace = existingWorkspace;
    } else {
      // Create demo workspace
      workspace = workspaceRepo.create({
        name: 'Demo Workspace',
        slug: 'demo-workspace',
        description: 'Demo workspace for testing',
        organizationId: org.id,
        ownerId: adminUser.id,
        createdBy: adminUser.id,
        isPrivate: false,
        defaultMethodology: 'agile',
      });
      workspace = await workspaceRepo.save(workspace);
      console.log(
        `✅ Created workspace: ${workspace.name} (${workspace.id})\n`,
      );
    }

    // Check if project already exists in this workspace
    const existingProject = await projectRepo.findOne({
      where: {
        workspaceId: workspace.id,
        organizationId: org.id,
      },
    });

    if (existingProject) {
      console.log('✅ Project already exists, skipping project creation\n');
    } else {
      // Create demo project
      const project = projectRepo.create({
        name: 'Demo Project',
        description: 'Demo project for testing',
        workspaceId: workspace.id,
        organizationId: org.id,
        createdById: adminUser.id,
        status: ProjectStatus.ACTIVE,
        methodology: 'agile',
        startDate: new Date(),
      });
      await projectRepo.save(project);
      console.log(`✅ Created project: ${project.name} (${project.id})\n`);
    }

    // Count existing data for banner
    const templateRepo = dataSource.getRepository('ProjectTemplate' as any);
    const templateCount = await templateRepo
      .count({ where: { organizationId: org.id } })
      .catch(() => 0);
    const workspaceCount = await workspaceRepo
      .count({ where: { organizationId: org.id } })
      .catch(() => 0);
    const projectCount = await projectRepo
      .count({ where: { organizationId: org.id } })
      .catch(() => 0);

    console.log('✅ Demo data seed complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 SEED BANNER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Organization: ${org.name} (${org.slug || org.id})`);
    console.log(`   Admin Email:  ${adminUser.email}`);
    console.log(`   Templates:    ${templateCount}`);
    console.log(`   Workspaces:   ${workspaceCount}`);
    console.log(`   Projects:     ${projectCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('✅ Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}

export { seedDemoData };
