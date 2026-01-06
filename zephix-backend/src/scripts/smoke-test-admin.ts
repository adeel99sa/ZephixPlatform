/**
 * Smoke test script for admin endpoints
 * Tests that all admin endpoints return 200 with standardized response contracts
 * Run with: npm run smoke:admin-endpoints
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

interface TestResult {
  endpoint: string;
  status: number;
  success: boolean;
  schemaValid: boolean;
  error?: string;
  data?: any;
}

/**
 * Validate response schema matches expected contract
 */
function validateResponseSchema(endpoint: string, data: any): boolean {
  // All admin read endpoints must return { data: ... }
  if (!data || typeof data !== 'object') {
    console.error(`  ❌ Schema invalid: Response is not an object`);
    return false;
  }

  if (!('data' in data)) {
    console.error(`  ❌ Schema invalid: Missing 'data' field in response`);
    return false;
  }

  switch (endpoint) {
    case 'GET /api/admin/stats':
      // Must be { data: Stats }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      const requiredStatsFields = [
        'userCount',
        'activeUsers',
        'templateCount',
        'projectCount',
      ];
      for (const field of requiredStatsFields) {
        if (!(field in data.data)) {
          console.error(
            `  ❌ Schema invalid: Missing required field '${field}' in stats`,
          );
          return false;
        }
      }
      break;

    case 'GET /api/admin/health':
      // Must be { data: SystemHealth }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      const requiredHealthFields = ['status', 'timestamp', 'database'];
      for (const field of requiredHealthFields) {
        if (!(field in data.data)) {
          console.error(
            `  ❌ Schema invalid: Missing required field '${field}' in health`,
          );
          return false;
        }
      }
      break;

    case 'GET /api/admin/org/summary':
      // Must be { data: OrgSummary }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      const requiredOrgFields = ['name', 'id', 'totalUsers', 'totalWorkspaces'];
      for (const field of requiredOrgFields) {
        if (!(field in data.data)) {
          console.error(
            `  ❌ Schema invalid: Missing required field '${field}' in org summary`,
          );
          return false;
        }
      }
      break;

    case 'GET /api/admin/users/summary':
      // Must be { data: UserSummary }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      if (!('total' in data.data) || !('byRole' in data.data)) {
        console.error(
          `  ❌ Schema invalid: Missing required fields 'total' or 'byRole' in users summary`,
        );
        return false;
      }
      break;

    case 'GET /api/admin/workspaces/summary':
      // Must be { data: WorkspaceSummary }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      if (
        !('total' in data.data) ||
        !('byType' in data.data) ||
        !('byStatus' in data.data)
      ) {
        console.error(
          `  ❌ Schema invalid: Missing required fields in workspaces summary`,
        );
        return false;
      }
      break;

    case 'GET /api/admin/risk/summary':
      // Must be { data: RiskSummary }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      const requiredRiskFields = ['projectsAtRisk', 'overallocatedResources'];
      for (const field of requiredRiskFields) {
        if (!(field in data.data)) {
          console.error(
            `  ❌ Schema invalid: Missing required field '${field}' in risk summary`,
          );
          return false;
        }
      }
      break;
  }

  return true;
}

async function testAdminEndpoints(accessToken: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const endpoints = [
    { name: 'GET /api/admin/stats', url: `${BASE_URL}/admin/stats` },
    { name: 'GET /api/admin/health', url: `${BASE_URL}/admin/health` },
    {
      name: 'GET /api/admin/org/summary',
      url: `${BASE_URL}/admin/org/summary`,
    },
    {
      name: 'GET /api/admin/users/summary',
      url: `${BASE_URL}/admin/users/summary`,
    },
    {
      name: 'GET /api/admin/workspaces/summary',
      url: `${BASE_URL}/admin/workspaces/summary`,
    },
    {
      name: 'GET /api/admin/risk/summary',
      url: `${BASE_URL}/admin/risk/summary`,
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, { headers });
      const schemaValid = validateResponseSchema(endpoint.name, response.data);
      results.push({
        endpoint: endpoint.name,
        status: response.status,
        success: response.status === 200 && schemaValid,
        schemaValid,
        data: response.data,
      });
    } catch (error: any) {
      results.push({
        endpoint: endpoint.name,
        status: error.response?.status || 0,
        success: false,
        schemaValid: false,
        error: error.message || String(error),
        data: error.response?.data,
      });
    }
  }

  return results;
}

async function main() {
  console.log('🧪 Admin Endpoints Smoke Test\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Get access token from environment
  const accessToken = process.env.ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ ERROR: ACCESS_TOKEN environment variable is required');
    console.log('\nUsage:');
    console.log('  ACCESS_TOKEN=<your-token> npm run smoke:admin-endpoints');
    console.log('\nTo get a token:');
    console.log('  1. Login to the app');
    console.log('  2. Open browser DevTools → Application → Local Storage');
    console.log('  3. Copy the value of "zephix.at"');
    console.log(
      '  4. Run: ACCESS_TOKEN=<copied-token> npm run smoke:admin-endpoints',
    );
    process.exit(1);
  }

  console.log('Testing admin endpoints...\n');

  const results = await testAdminEndpoints(accessToken);

  // Print results
  let allPassed = true;
  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    const status = result.status || 'N/A';
    console.log(`${icon} ${result.endpoint}`);
    console.log(`   Status: ${status}`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
      allPassed = false;
    } else if (result.data) {
      // Show schema validation status
      if (result.schemaValid) {
        console.log(`   Schema: ✅ Valid`);
      } else {
        console.log(`   Schema: ❌ Invalid`);
        allPassed = false;
      }

      // Show a summary of the response
      if (result.data.data) {
        if (typeof result.data.data === 'object') {
          const keys = Object.keys(result.data.data);
          console.log(
            `   Response: { data: Object with keys: ${keys.join(', ')} }`,
          );
        } else {
          console.log(`   Response: { data: ${typeof result.data.data} }`);
        }
      } else {
        console.log(
          `   Response: ${JSON.stringify(result.data).substring(0, 100)}`,
        );
      }
    }
    console.log('');
  }

  // Summary
  const passed = results.filter((r) => r.success).length;
  const total = results.length;
  const schemaValid = results.filter((r) => r.schemaValid).length;
  console.log(
    `\n📊 Summary: ${passed}/${total} endpoints passed (${schemaValid}/${total} schemas valid)\n`,
  );

  if (allPassed) {
    console.log(
      '✅ All admin endpoints are working correctly with valid schemas!',
    );
    process.exit(0);
  } else {
    console.log(
      '❌ Some endpoints failed or have invalid schemas. Check the errors above.',
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

