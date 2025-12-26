/**
 * Smoke test script for projects endpoints
 * Tests that all projects endpoints return 200 with standardized response contracts
 * Run with: npm run smoke:projects
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
  if (!data || typeof data !== 'object') {
    console.error(`  ❌ Schema invalid: Response is not an object`);
    return false;
  }

  if (!('data' in data)) {
    console.error(`  ❌ Schema invalid: Missing 'data' field in response`);
    return false;
  }

  switch (endpoint) {
    case 'GET /api/projects':
      // Must be { data: { projects, total, page, totalPages } }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      const requiredListFields = ['projects', 'total', 'page', 'totalPages'];
      for (const field of requiredListFields) {
        if (!(field in data.data)) {
          console.error(
            `  ❌ Schema invalid: Missing required field '${field}' in projects list`,
          );
          return false;
        }
      }
      if (!Array.isArray(data.data.projects)) {
        console.error(
          `  ❌ Schema invalid: Expected projects to be array, got ${typeof data.data.projects}`,
        );
        return false;
      }
      break;

    case 'GET /api/projects/:id':
      // Must be { data: Project | null }
      if (data.data !== null && typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object or null, got ${typeof data.data}`,
        );
        return false;
      }
      break;

    case 'GET /api/projects/stats':
      // Must be { data: Stats }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      const requiredStatsFields = ['total', 'active', 'completed', 'onHold'];
      for (const field of requiredStatsFields) {
        if (!(field in data.data)) {
          console.error(
            `  ❌ Schema invalid: Missing required field '${field}' in stats`,
          );
          return false;
        }
      }
      break;
  }

  return true;
}

async function testProjectsEndpoints(
  accessToken: string,
  projectId?: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const endpoints = [
    { name: 'GET /api/projects', url: `${BASE_URL}/projects` },
    { name: 'GET /api/projects/stats', url: `${BASE_URL}/projects/stats` },
  ];

  // Add project detail endpoint if projectId provided
  if (projectId) {
    endpoints.push({
      name: 'GET /api/projects/:id',
      url: `${BASE_URL}/projects/${projectId}`,
    });
  }

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
  console.log('🧪 Projects Endpoints Smoke Test\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Get access token from environment
  const accessToken = process.env.ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ ERROR: ACCESS_TOKEN environment variable is required');
    console.log('\nUsage:');
    console.log('  ACCESS_TOKEN=<your-token> npm run smoke:projects');
    console.log(
      '  ACCESS_TOKEN=<your-token> PROJECT_ID=<project-id> npm run smoke:projects',
    );
    console.log('\nTo get a token:');
    console.log('  1. Login to the app');
    console.log('  2. Open browser DevTools → Application → Local Storage');
    console.log('  3. Copy the value of "zephix.at"');
    process.exit(1);
  }

  const projectId = process.env.PROJECT_ID;

  console.log('Testing projects endpoints...\n');

  const results = await testProjectsEndpoints(accessToken, projectId);

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
        } else if (result.data.data === null) {
          console.log(`   Response: { data: null }`);
        } else if (typeof result.data.data === 'object') {
          if ('projects' in result.data.data) {
            console.log(
              `   Response: { data: { projects: Array[${result.data.data.projects.length}], total: ${result.data.data.total} } }`,
            );
          } else {
            const keys = Object.keys(result.data.data);
            console.log(
              `   Response: { data: Object with keys: ${keys.join(', ')} }`,
            );
          }
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
      '✅ All projects endpoints are working correctly with valid schemas!',
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
