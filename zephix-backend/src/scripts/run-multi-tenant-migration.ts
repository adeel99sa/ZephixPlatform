import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function runMigration() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('Running multi-tenancy migration...');
    await dataSource.runMigrations({
      transaction: 'each',
      fake: false,
    });
    console.log('✅ Multi-tenancy migration completed successfully!');

    // Create a sample organization and user for testing
    console.log('Creating sample organization...');

    const organizationRepo = dataSource.getRepository('Organization');
    const userOrganizationRepo = dataSource.getRepository('UserOrganization');
    const userRepo = dataSource.getRepository('User');

    // Check if we have any organizations
    const existingOrg = await organizationRepo.findOne({ where: {} });

    if (!existingOrg) {
      // Create sample organization
      const sampleOrg = await organizationRepo.save({
        name: 'Acme Corporation',
        slug: 'acme-corp',
        status: 'active',
        description: 'Sample organization for testing',
        settings: { timezone: 'UTC', currency: 'USD' },
      });

      console.log(`✅ Created sample organization: ${sampleOrg.name}`);

      // Associate existing users with the organization
      const users = await userRepo.find({ take: 5 }); // Get first 5 users

      for (const user of users) {
        await userOrganizationRepo.save({
          userId: user.id,
          organizationId: sampleOrg.id,
          role: 'owner', // Make first user owner, others admin
          isActive: true,
          joinedAt: new Date(),
        });
      }

      console.log(`✅ Associated ${users.length} users with the organization`);

      // Update existing projects to belong to this organization
      const projectRepo = dataSource.getRepository('Project');
      await projectRepo.update({}, { organizationId: sampleOrg.id });

      const teams = dataSource.getRepository('Team');
      await teams.update({}, { organizationId: sampleOrg.id });

      const teamMembers = dataSource.getRepository('TeamMember');
      await teamMembers.update({}, { organizationId: sampleOrg.id });

      console.log('✅ Updated existing projects and teams with organization');
    } else {
      console.log('Organization already exists, skipping sample data creation');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

runMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
