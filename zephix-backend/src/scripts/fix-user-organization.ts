import { DataSource } from 'typeorm';

async function fixUserOrganization() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    console.log('🔧 Fixing user organization...');

    // 1. Check if user exists
    const user = await dataSource.query(
      'SELECT id, email, organization_id FROM users WHERE email = $1',
      ['adeel99sa@yahoo.com'],
    );

    if (user.length === 0) {
      console.error('❌ User not found');
      return;
    }

    console.log('👤 User found:', user[0]);

    // 2. Check if organization exists
    let org = await dataSource.query(
      'SELECT id, name FROM organizations LIMIT 1',
    );

    if (org.length === 0) {
      // Create default organization
      console.log('🏢 Creating default organization...');
      const newOrg = await dataSource.query(`
        INSERT INTO organizations (id, name, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Default Organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name
      `);
      org = newOrg;
    }

    console.log('🏢 Organization found:', org[0]);

    // 3. Update user with organization
    if (!user[0].organization_id) {
      console.log('🔗 Assigning user to organization...');
      await dataSource.query(
        'UPDATE users SET organization_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [org[0].id, user[0].id],
      );
      console.log('✅ User assigned to organization');
    } else {
      console.log('✅ User already has organization');
    }

    // 4. Create some sample resources
    console.log('👥 Creating sample resources...');
    const resources = [
      {
        name: 'John Smith',
        email: 'john@example.com',
        role: 'Senior Developer',
        skills: ['TypeScript', 'React', 'Node.js'],
        capacity_hours_per_week: 40,
        cost_per_hour: 150,
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'Project Manager',
        skills: ['Agile', 'Scrum', 'Risk Management'],
        capacity_hours_per_week: 40,
        cost_per_hour: 120,
      },
      {
        name: 'Mike Chen',
        email: 'mike@example.com',
        role: 'UX Designer',
        skills: ['Figma', 'UI/UX', 'Prototyping'],
        capacity_hours_per_week: 40,
        cost_per_hour: 130,
      },
    ];

    for (const resource of resources) {
      await dataSource.query(
        `
        INSERT INTO resources (
          id, organization_id, name, email, role, skills, 
          capacity_hours_per_week, cost_per_hour, is_active, 
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (email) DO NOTHING
      `,
        [
          org[0].id,
          resource.name,
          resource.email,
          resource.role,
          JSON.stringify(resource.skills),
          resource.capacity_hours_per_week,
          resource.cost_per_hour,
        ],
      );
    }

    console.log('✅ Sample resources created');

    // 5. Verify the fix
    const updatedUser = await dataSource.query(
      'SELECT id, email, organization_id FROM users WHERE email = $1',
      ['adeel99sa@yahoo.com'],
    );

    console.log('✅ User updated:', updatedUser[0]);

    const resourceCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM resources WHERE organization_id = $1',
      [org[0].id],
    );

    console.log('✅ Resources created:', resourceCount[0].count);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

fixUserOrganization().catch(console.error);
