#!/usr/bin/env ts-node
/**
 * Sanity check script for RequireOrgRoleGuard
 * Tests role mapping and guard behavior for admin, member, and guest users
 */

import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const BACKEND_LOG = '/tmp/backend.log';

interface LoginResponse {
  data?: {
    user: {
      id: string;
      email: string;
      role: string;
    };
    accessToken: string;
  };
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface TestUser {
  email: string;
  password: string;
  expectedRole: string;
  expectedOrgRole: string;
}

const testUsers: TestUser[] = [
  {
    email: 'admin@zephix.ai',
    password: 'admin123456',
    expectedRole: 'admin',
    expectedOrgRole: 'admin',
  },
  {
    email: 'member@zephix.ai',
    password: 'member123456',
    expectedRole: 'MEMBER',
    expectedOrgRole: 'project_manager',
  },
  {
    email: 'guest@zephix.ai',
    password: 'guest123456',
    expectedRole: 'viewer',
    expectedOrgRole: 'viewer',
  },
];

async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email,
    password,
  });
  return response.data;
}

async function createWorkspace(token: string, name: string, slug: string) {
  try {
    const response = await axios.post(
      `${API_BASE}/workspaces`,
      {
        name,
        slug,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return { status: response.status, data: response.data };
  } catch (error: any) {
    return {
      status: error.response?.status || 500,
      error: error.response?.data?.message || error.message,
    };
  }
}

async function getWorkspaces(token: string) {
  try {
    const response = await axios.get(`${API_BASE}/workspaces`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return { status: response.status, data: response.data };
  } catch (error: any) {
    return {
      status: error.response?.status || 500,
      error: error.response?.data?.message || error.message,
    };
  }
}

function checkLogs(userEmail: string, expectedOrgRole: string, requiredRole?: string) {
  const fs = require('fs');
  if (!fs.existsSync(BACKEND_LOG)) {
    console.log('⚠️  Backend log not found at', BACKEND_LOG);
    return;
  }

  const logContent = fs.readFileSync(BACKEND_LOG, 'utf-8');
  const lines = logContent.split('\n');
  const recentLines = lines.slice(-50); // Last 50 lines

  const guardLogs = recentLines.filter((line: string) =>
    line.includes('Guard role check'),
  );

  if (guardLogs.length === 0) {
    console.log('⚠️  No guard logs found in recent backend output');
    return;
  }

  const lastLog = guardLogs[guardLogs.length - 1];
  console.log('📋 Last guard log:', lastLog);

  // Verify expected mapping
  if (requiredRole) {
    const expectedLog = `mapped to orgRole: ${expectedOrgRole} required: ${requiredRole}`;
    if (lastLog.includes(expectedLog)) {
      console.log('✅ Guard log shows correct mapping and requirement');
    } else {
      console.log('❌ Guard log does not match expected pattern');
    }
  } else {
    if (lastLog.includes(`mapped to orgRole: ${expectedOrgRole}`)) {
      console.log('✅ Guard log shows correct role mapping');
    } else {
      console.log('❌ Guard log does not show expected orgRole');
    }
  }
}

async function runSanityCheck() {
  console.log('🧪 Starting Guard Sanity Check\n');
  console.log('=' .repeat(60));

  for (const user of testUsers) {
    console.log(`\n👤 Testing as: ${user.email}`);
    console.log('-'.repeat(60));

    try {
      // Step 1: Login
      console.log('1️⃣  Logging in...');
      const loginResult = await login(user.email, user.password);
      const token = loginResult.data?.accessToken || loginResult.accessToken;
      const userData = loginResult.data?.user || loginResult.user;
      const actualRole = userData?.role;

      console.log(`   ✅ Logged in as ${user.email}`);
      console.log(`   📝 JWT role: ${actualRole}`);
      console.log(`   🎯 Expected orgRole: ${user.expectedOrgRole}`);

      // Step 2: Get workspaces (should work for all)
      console.log('\n2️⃣  Fetching workspaces...');
      const workspacesResult = await getWorkspaces(token);
      if (workspacesResult.status === 200) {
        console.log(`   ✅ GET /api/workspaces → 200 OK`);
        console.log(`   📦 Found ${workspacesResult.data?.length || 0} workspaces`);
      } else {
        console.log(`   ❌ GET /api/workspaces → ${workspacesResult.status}`);
        console.log(`   Error: ${workspacesResult.error}`);
      }

      // Step 3: Try to create workspace
      console.log('\n3️⃣  Attempting to create workspace...');
      const workspaceName = `Test Workspace ${Date.now()}`;
      const workspaceSlug = 'test-workspace-' + Date.now();
      const createResult = await createWorkspace(token, workspaceName, workspaceSlug);

      if (createResult.status === 201) {
        console.log(`   ✅ POST /api/workspaces → 201 Created`);
        console.log(`   📝 Workspace slug: ${createResult.data?.slug}`);
        if (createResult.data?.slug === 'test-workspace-' + Date.now().toString().slice(-10)) {
          console.log('   ✅ Slug normalization working');
        }
      } else if (createResult.status === 403) {
        console.log(`   ✅ POST /api/workspaces → 403 Forbidden (expected for ${user.expectedOrgRole})`);
        console.log(`   📝 Error: ${createResult.error}`);
        if (createResult.error?.includes('Required role: admin')) {
          console.log('   ✅ Guard correctly blocking non-admin users');
        }
      } else {
        console.log(`   ❌ POST /api/workspaces → ${createResult.status}`);
        console.log(`   Error: ${createResult.error}`);
      }

      // Step 4: Check logs
      console.log('\n4️⃣  Checking backend logs...');
      checkLogs(user.email, user.expectedOrgRole, 'admin');

      // Small delay between users
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`   ❌ Error testing ${user.email}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Sanity check complete!');
  console.log('\n📋 Summary:');
  console.log('   - Admin should create workspaces → 201');
  console.log('   - Member should be blocked → 403');
  console.log('   - Guest should be blocked → 403');
  console.log('   - All should see guard logs with correct mapping');
}

// Run if executed directly
if (require.main === module) {
  runSanityCheck()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runSanityCheck };

