/**
 * Smoke test script for templates endpoints
 * Tests that all templates endpoints return 200 with standardized response contracts
 * Run with: npm run smoke:templates
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
  // All templates read endpoints must return { data: ... }
  if (!data || typeof data !== 'object') {
    console.error(`  ❌ Schema invalid: Response is not an object`);
    return false;
  }

  if (!('data' in data)) {
    console.error(`  ❌ Schema invalid: Missing 'data' field in response`);
    return false;
  }

  switch (endpoint) {
    case 'GET /api/templates':
      // Must be { data: Template[] }
      if (!Array.isArray(data.data)) {
        console.error(
          `  ❌ Schema invalid: Expected data to be array, got ${typeof data.data}`,
        );
        return false;
      }
      break;

    case 'GET /api/templates/:id':
      // Must be { data: TemplateDetail | null }
      if (data.data !== null && typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object or null, got ${typeof data.data}`,
        );
        return false;
      }
      if (data.data !== null) {
        // Validate required Template fields
        const requiredFields = ['id', 'name'];
        for (const field of requiredFields) {
          if (!(field in data.data)) {
            console.error(
              `  ❌ Schema invalid: Missing required field '${field}' in template`,
            );
            return false;
          }
        }
      }
      break;

    case 'POST /api/templates/:id/instantiate':
      // Must be { data: { projectId, name, workspaceId } }
      if (!data.data || typeof data.data !== 'object') {
        console.error(
          `  ❌ Schema invalid: Expected data to be object, got ${typeof data.data}`,
        );
        return false;
      }
      const requiredFields = ['projectId'];
      for (const field of requiredFields) {
        if (!(field in data.data)) {
          console.error(
            `  ❌ Schema invalid: Missing required field '${field}' in instantiate response`,
          );
          return false;
        }
      }
      break;
  }

  return true;
}

async function testTemplatesEndpoints(
  accessToken: string,
  templateId?: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Test GET /api/templates
  try {
    const response = await axios.get(`${BASE_URL}/templates`, { headers });
    const schemaValid = validateResponseSchema(
      'GET /api/templates',
      response.data,
    );
    results.push({
      endpoint: 'GET /api/templates',
      status: response.status,
      success: response.status === 200 && schemaValid,
      schemaValid,
      data: response.data,
    });
  } catch (error: any) {
    results.push({
      endpoint: 'GET /api/templates',
      status: error.response?.status || 0,
      success: false,
      schemaValid: false,
      error: error.message || String(error),
      data: error.response?.data,
    });
  }

  // Test GET /api/templates/:id (use first template if available, or a test ID)
  if (templateId) {
    try {
      const response = await axios.get(`${BASE_URL}/templates/${templateId}`, {
        headers,
      });
      const schemaValid = validateResponseSchema(
        'GET /api/templates/:id',
        response.data,
      );
      results.push({
        endpoint: 'GET /api/templates/:id',
        status: response.status,
        success: response.status === 200 && schemaValid,
        schemaValid,
        data: response.data,
      });
    } catch (error: any) {
      results.push({
        endpoint: 'GET /api/templates/:id',
        status: error.response?.status || 0,
        success: false,
        schemaValid: false,
        error: error.message || String(error),
        data: error.response?.data,
      });
    }
  } else {
    // Try to get first template from list
    try {
      const listResponse = await axios.get(`${BASE_URL}/templates`, {
        headers,
      });
      if (
        listResponse.data?.data &&
        Array.isArray(listResponse.data.data) &&
        listResponse.data.data.length > 0
      ) {
        const firstTemplateId = listResponse.data.data[0].id;
        const response = await axios.get(
          `${BASE_URL}/templates/${firstTemplateId}`,
          { headers },
        );
        const schemaValid = validateResponseSchema(
          'GET /api/templates/:id',
          response.data,
        );
        results.push({
          endpoint: 'GET /api/templates/:id',
          status: response.status,
          success: response.status === 200 && schemaValid,
          schemaValid,
          data: response.data,
        });
      } else {
        // No templates available, test with a non-existent ID (should return null)
        try {
          const response = await axios.get(
            `${BASE_URL}/templates/non-existent-id`,
            { headers },
          );
          const schemaValid = validateResponseSchema(
            'GET /api/templates/:id',
            response.data,
          );
          results.push({
            endpoint: 'GET /api/templates/:id',
            status: response.status,
            success:
              response.status === 200 &&
              schemaValid &&
              response.data.data === null,
            schemaValid,
            data: response.data,
          });
        } catch (error: any) {
          // If it returns 404, that's also acceptable (though we prefer 200 with null)
          results.push({
            endpoint: 'GET /api/templates/:id',
            status: error.response?.status || 0,
            success:
              error.response?.status === 404 || error.response?.status === 200,
            schemaValid: false,
            error: error.message || String(error),
            data: error.response?.data,
          });
        }
      }
    } catch (error: any) {
      results.push({
        endpoint: 'GET /api/templates/:id',
        status: 0,
        success: false,
        schemaValid: false,
        error: 'Could not test - failed to get template list',
        data: null,
      });
    }
  }

  // Test POST /api/templates/:id/instantiate (validation only - requires workspaceId)
  // This test validates the 400 response for missing fields
  if (templateId) {
    try {
      // Test with missing workspaceId - should return 400
      await axios.post(
        `${BASE_URL}/templates/${templateId}/instantiate`,
        { projectName: 'Test Project' },
        { headers },
      );
      results.push({
        endpoint: 'POST /api/templates/:id/instantiate (validation)',
        status: 0,
        success: false,
        schemaValid: false,
        error: 'Expected 400 for missing workspaceId but got success',
      });
    } catch (error: any) {
      const is400 = error.response?.status === 400;
      const hasErrorCode = error.response?.data?.code !== undefined;
      results.push({
        endpoint: 'POST /api/templates/:id/instantiate (validation)',
        status: error.response?.status || 0,
        success: is400 && hasErrorCode,
        schemaValid: hasErrorCode,
        error: is400 ? undefined : error.message || String(error),
        data: error.response?.data,
      });
    }
  }

  return results;
}

async function main() {
  console.log('🧪 Templates Endpoints Smoke Test\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Get access token from environment
  const accessToken = process.env.ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ ERROR: ACCESS_TOKEN environment variable is required');
    console.log('\nUsage:');
    console.log('  ACCESS_TOKEN=<your-token> npm run smoke:templates');
    console.log('\nTo get a token:');
    console.log('  1. Login to the app');
    console.log('  2. Open browser DevTools → Application → Local Storage');
    console.log('  3. Copy the value of "zephix.at"');
    console.log(
      '  4. Run: ACCESS_TOKEN=<copied-token> npm run smoke:templates',
    );
    process.exit(1);
  }

  const templateId = process.env.TEMPLATE_ID; // Optional: specific template to test

  console.log('Testing templates endpoints...\n');

  const results = await testTemplatesEndpoints(accessToken, templateId);

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
      '✅ All templates endpoints are working correctly with valid schemas!',
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

