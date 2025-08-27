import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { Organization } from '../organizations/entities/organization.entity';
import * as bcrypt from 'bcrypt';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://malikadeel@localhost:5432/zephix_development',
  entities: [User, Project, ResourceAllocation, Organization],
  synchronize: false,
});

async function seedResourceConflicts() {
  await AppDataSource.initialize();
  console.log('Creating test data for resource conflicts...');

  // Get or create organization
  let org = await AppDataSource.getRepository(Organization).findOne({
    where: { name: 'Test Company' }
  });
  
  if (!org) {
    org = await AppDataSource.getRepository(Organization).save({
      name: 'Test Company',
      domain: 'testcompany.com'
    });
  }

  // Create test users (resources)
  const users: User[] = [];
  const userNames = ['Sarah Johnson', 'Mike Chen', 'Emily Davis', 'John Smith', 'Lisa Wong'];
  
  for (const name of userNames) {
    const email = name.toLowerCase().replace(' ', '.') + '@testcompany.com';
    let user = await AppDataSource.getRepository(User).findOne({ where: { email } });
    
    if (!user) {
      user = await AppDataSource.getRepository(User).save({
        email,
        name,
        password: await bcrypt.hash('password123', 10),
        organizationId: org.id,
        role: 'user'
      });
    }
    users.push(user);
  }

  // Create test projects
  const projects: Project[] = [];
  const projectNames = [
    'Customer Portal Redesign',
    'API Migration Phase 2',
    'Mobile App Launch',
    'Infrastructure Upgrade',
    'Data Analytics Platform'
  ];

  for (const name of projectNames) {
    let project = await AppDataSource.getRepository(Project).findOne({ 
      where: { name, organizationId: org.id } 
    });
    
    if (!project) {
      project = await AppDataSource.getRepository(Project).save({
        name,
        description: `${name} - Critical Q1 2026 deliverable`,
        organizationId: org.id,
        status: 'planning' as any,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-03-31'),
        createdById: users[0].id
      });
    }
    projects.push(project);
  }

  // Create overlapping allocations to trigger conflicts
  const allocations = [
    // Sarah Johnson - OVERALLOCATED (140% on multiple days)
    {
      resourceId: users[0].id,
      resource: users[0],
      projectId: projects[0].id,
      project: projects[0],
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-09-15'),
      allocationPercentage: 80,
      hoursPerDay: 6.4
    },
    {
      resourceId: users[0].id,
      resource: users[0],
      projectId: projects[1].id,
      project: projects[1],
      startDate: new Date('2025-09-10'),
      endDate: new Date('2025-09-20'),
      allocationPercentage: 60,
      hoursPerDay: 4.8
    },
    
    // Mike Chen - CRITICAL OVERALLOCATION (180% on some days)
    {
      resourceId: users[1].id,
      resource: users[1],
      projectId: projects[1].id,
      project: projects[1],
      startDate: new Date('2025-09-05'),
      endDate: new Date('2025-09-25'),
      allocationPercentage: 100,
      hoursPerDay: 8
    },
    {
      resourceId: users[1].id,
      resource: users[1],
      projectId: projects[2].id,
      project: projects[2],
      startDate: new Date('2025-09-10'),
      endDate: new Date('2025-09-30'),
      allocationPercentage: 80,
      hoursPerDay: 6.4
    },
    
    // Emily Davis - Normal allocation (no conflict)
    {
      resourceId: users[2].id,
      resource: users[2],
      projectId: projects[3].id,
      project: projects[3],
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-09-30'),
      allocationPercentage: 75,
      hoursPerDay: 6
    }
  ];

  // Clear existing allocations
  await AppDataSource.getRepository(ResourceAllocation).delete({});
  
  // Insert new allocations
  for (const allocation of allocations) {
    await AppDataSource.getRepository(ResourceAllocation).save(allocation);
  }

  console.log('✅ Created test data:');
  console.log(`   - ${users.length} users`);
  console.log(`   - ${projects.length} projects`);
  console.log(`   - ${allocations.length} resource allocations`);
  console.log('\n🎯 Expected conflicts:');
  console.log('   - Sarah Johnson: 140% allocated Sept 10-15');
  console.log('   - Mike Chen: 180% allocated Sept 10-25');
  console.log('   - Emily Davis: No conflicts (75% allocated)');

  await AppDataSource.destroy();
}

seedResourceConflicts()
  .then(() => {
    console.log('\n✅ Seed data created successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error creating seed data:', error);
    process.exit(1);
  });
