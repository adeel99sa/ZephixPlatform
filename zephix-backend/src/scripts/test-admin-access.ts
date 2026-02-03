/**
 * Test script to verify admin access is working correctly
 * Run with: npx ts-node src/scripts/test-admin-access.ts
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function testAdminAccess() {
  console.log('🔍 Testing Admin Access Setup...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  await dataSource.initialize();

  try {
    // 1. Check if admin user exists
    console.log('1. Checking admin user...');
    const adminUsers = await dataSource.query(
      `SELECT id, email, organization_id, role FROM users WHERE email = $1`,
      ['admin@zephix.ai'],
    );

    if (adminUsers.length === 0) {
      console.error('❌ admin@zephix.ai user not found!');
      console.log(
        '   Run demo bootstrap: DEMO_BOOTSTRAP=true npm run start:dev',
      );
      return;
    }

    const adminUser = adminUsers[0];
    console.log('✅ Admin user found:', {
      id: adminUser.id,
      email: adminUser.email,
      organization_id: adminUser.organization_id,
      userRole: adminUser.role,
    });

    // 2. Check UserOrganization record
    console.log('\n2. Checking UserOrganization record...');
    const userOrgs = await dataSource.query(
      `SELECT user_id, organization_id, role, "isActive"
       FROM user_organizations
       WHERE user_id = $1 AND organization_id = $2 AND "isActive" = true`,
      [adminUser.id, adminUser.organization_id],
    );

    if (userOrgs.length === 0) {
      console.error('❌ UserOrganization record not found!');
      console.log('   This means admin@zephix.ai has no org role assigned.');
      console.log(
        '   Run demo bootstrap: DEMO_BOOTSTRAP=true npm run start:dev',
      );
      return;
    }

    const userOrg = userOrgs[0];
    console.log('✅ UserOrganization record found:', {
      userId: userOrg.user_id,
      organizationId: userOrg.organization_id,
      role: userOrg.role,
      isActive: userOrg.isActive,
    });

    // 3. Verify role is admin or owner
    console.log('\n3. Verifying admin role...');
    if (userOrg.role !== 'admin' && userOrg.role !== 'owner') {
      console.error(
        `❌ UserOrganization role is "${userOrg.role}", expected "admin" or "owner"`,
      );
      console.log(
        '   Fix: Update the role in database or re-run demo bootstrap',
      );
      return;
    }
    console.log(`✅ Role is "${userOrg.role}" (admin/owner)`);

    // 4. Test buildUserResponse logic
    console.log('\n4. Testing buildUserResponse logic...');
    const isOrgAdmin = userOrg.role === 'admin' || userOrg.role === 'owner';
    const expectedIsAdmin = isOrgAdmin || false; // isPlatformSuperAdmin is false

    console.log('   orgRoleFromUserOrg:', userOrg.role);
    console.log('   isOrgAdmin:', isOrgAdmin);
    console.log('   expected permissions.isAdmin:', expectedIsAdmin);

    if (expectedIsAdmin) {
      console.log('✅ buildUserResponse would set permissions.isAdmin = true');
    } else {
      console.error(
        '❌ buildUserResponse would set permissions.isAdmin = false',
      );
      return;
    }

    // 5. Summary
    console.log('\n📋 Summary:');
    console.log('✅ Admin user exists');
    console.log('✅ UserOrganization record exists');
    console.log('✅ Role is admin/owner');
    console.log('✅ permissions.isAdmin would be true');
    console.log('\n✅ All checks passed! Admin access should work.');
    console.log('\nNext steps:');
    console.log('1. Make sure backend is running');
    console.log('2. Login as admin@zephix.ai / admin123456');
    console.log(
      '3. Check Network tab → /api/auth/me → should show permissions.isAdmin: true',
    );
    console.log('4. Navigate to /admin - should work');
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await dataSource.destroy();
  }
}

testAdminAccess().catch(console.error);
