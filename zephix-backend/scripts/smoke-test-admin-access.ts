/**
 * Smoke test for admin access
 * Tests that admin@zephix.ai returns isAdmin: true and member@zephix.ai returns isAdmin: false
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    email: string;
    role: string;
    platformRole?: string;
    permissions?: {
      isAdmin?: boolean;
    };
  };
}

interface MeResponse {
  email: string;
  role: string;
  platformRole?: string;
  permissions?: {
    isAdmin?: boolean;
  };
}

async function testUser(email: string, password: string, expectedAdmin: boolean) {
  console.log(`\n🧪 Testing ${email}...`);
  console.log(`   Expected isAdmin: ${expectedAdmin}`);

  try {
    // Step 1: Login
    const loginResponse = await axios.post<LoginResponse>(`${BASE_URL}/auth/login`, {
      email,
      password,
    });

    const token = loginResponse.data.accessToken;
    if (!token) {
      console.error(`   ❌ No access token received`);
      return false;
    }

    // Step 2: Check login response
    const loginUser = loginResponse.data.user;
    console.log(`   Login response:`);
    console.log(`     - role: ${loginUser.role}`);
    console.log(`     - platformRole: ${loginUser.platformRole || 'undefined'}`);
    console.log(`     - permissions.isAdmin: ${loginUser.permissions?.isAdmin ?? 'undefined'}`);

    // Step 3: Call /auth/me
    const meResponse = await axios.get<MeResponse>(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const meUser = meResponse.data;
    console.log(`   /auth/me response:`);
    console.log(`     - role: ${meUser.role}`);
    console.log(`     - platformRole: ${meUser.platformRole || 'undefined'}`);
    console.log(`     - permissions.isAdmin: ${meUser.permissions?.isAdmin ?? 'undefined'}`);

    // Step 4: Verify
    const actualIsAdmin = meUser.permissions?.isAdmin === true;
    const roleMatches = meUser.role === 'ADMIN' || meUser.role === 'admin';

    if (actualIsAdmin === expectedAdmin) {
      console.log(`   ✅ PASS: isAdmin is ${actualIsAdmin} (expected ${expectedAdmin})`);
      if (expectedAdmin && !roleMatches) {
        console.log(`   ⚠️  WARNING: role is "${meUser.role}" but should be "ADMIN" for admin user`);
      }
      return true;
    } else {
      console.log(`   ❌ FAIL: isAdmin is ${actualIsAdmin} but expected ${expectedAdmin}`);
      return false;
    }
  } catch (error: any) {
    console.error(`   ❌ ERROR: ${error.message}`);
    if (error.response) {
      console.error(`     Status: ${error.response.status}`);
      console.error(`     Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`     Connection refused - is the backend server running on ${BASE_URL}?`);
    } else {
      console.error(`     Full error:`, error);
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Starting admin access smoke test...');
  console.log(`   Base URL: ${BASE_URL}`);

  const results = {
    admin: await testUser('admin@zephix.ai', 'admin123456', true),
    member: await testUser('member@zephix.ai', 'member123456', false),
  };

  console.log('\n📊 Results:');
  console.log(`   admin@zephix.ai: ${results.admin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   member@zephix.ai: ${results.member ? '✅ PASS' : '❌ FAIL'}`);

  if (results.admin && results.member) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check the output above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});






