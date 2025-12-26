/**
 * Smoke test script for billing endpoints
 * Tests that all billing endpoints return 200 with standardized response contracts
 * Run with: npm run smoke:admin
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
  // All billing read endpoints must return { data: ... }
  if (!data || typeof data !== 'object') {
    console.error(`  ❌ Schema invalid: Response is not an object`);
    return false;
  }

  if (!('data' in data)) {
    console.error(`  ❌ Schema invalid: Missing 'data' field in response`);
    return false;
  }

  switch (endpoint) {
    case 'GET /api/billing/plans':
      // Must be { data: Plan[] }
      if (!Array.isArray(data.data)) {
        console.error(
          `  ❌ Schema invalid: Expected data to be array, got ${typeof data.data}`,
        );
        return false;
      }
      break;

    case 'GET /api/billing/subscription':
      // Must be { data: Subscription | null }
      if (data.data !== null && typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object or null, got ${typeof data.data}`,
        );
        return false;
      }
      break;

    case 'GET /api/billing/current-plan':
      // Must be { data: CurrentPlan }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      // Validate required Plan fields
      const requiredFields = ['id', 'name', 'type', 'price'];
      for (const field of requiredFields) {
        if (!(field in data.data)) {
          console.error(
            `  ❌ Schema invalid: Missing required field '${field}' in plan`,
          );
          return false;
        }
      }
      break;

    case 'GET /api/billing/usage':
      // Must be { data: Usage }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      // Validate Usage structure
      const usageFields = ['users', 'projects', 'workspaces', 'storage'];
      for (const field of usageFields) {
        if (!(field in data.data)) {
          console.error(
            `  ❌ Schema invalid: Missing required field '${field}' in usage`,
          );
          return false;
        }
        if (
          typeof data.data[field] !== 'object' ||
          !('allowed' in data.data[field]) ||
          !('used' in data.data[field])
        ) {
          console.error(
            `  ❌ Schema invalid: Field '${field}' must have { allowed, used } structure`,
          );
          return false;
        }
      }
      break;
  }

  return true;
}

async function testBillingEndpoints(
  accessToken: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const endpoints = [
    { name: 'GET /api/billing/plans', url: `${BASE_URL}/billing/plans` },
    {
      name: 'GET /api/billing/subscription',
      url: `${BASE_URL}/billing/subscription`,
    },
    {
      name: 'GET /api/billing/current-plan',
      url: `${BASE_URL}/billing/current-plan`,
    },
    { name: 'GET /api/billing/usage', url: `${BASE_URL}/billing/usage` },
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
  console.log('🧪 Billing Endpoints Smoke Test\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Get access token from environment or prompt
  const accessToken = process.env.ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ ERROR: ACCESS_TOKEN environment variable is required');
    console.log('\nUsage:');
    console.log('  ACCESS_TOKEN=<your-token> npm run smoke:admin');
    console.log('\nTo get a token:');
    console.log('  1. Login to the app');
    console.log('  2. Open browser DevTools → Application → Local Storage');
    console.log('  3. Copy the value of "zephix.at"');
    console.log('  4. Run: ACCESS_TOKEN=<copied-token> npm run smoke:admin');
    process.exit(1);
  }

  console.log('Testing billing endpoints...\n');

  const results = await testBillingEndpoints(accessToken);

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
        if (Array.isArray(result.data.data)) {
          console.log(
            `   Response: { data: Array[${result.data.data.length}] }`,
          );
        } else if (typeof result.data.data === 'object') {
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
      '✅ All billing endpoints are working correctly with valid schemas!',
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
