/**
 * Resource Intelligence API Verification Tests
 *
 * Run against staging environment to verify Resource Intelligence behavior
 *
 * Usage:
 *   STAGING_URL=https://api-staging.getzephix.com \
 *   AUTH_TOKEN=your_jwt_token \
 *   ORGANIZATION_ID=your_org_id \
 *   RESOURCE_ID=your_resource_id \
 *   ts-node test/resource-intelligence-api-verification.ts
 */

import axios, { AxiosError } from 'axios';

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const ORGANIZATION_ID = process.env.ORGANIZATION_ID;
const RESOURCE_ID = process.env.RESOURCE_ID;

if (!AUTH_TOKEN || !ORGANIZATION_ID || !RESOURCE_ID) {
  console.error('❌ Missing required environment variables:');
  console.error('   AUTH_TOKEN, ORGANIZATION_ID, RESOURCE_ID');
  process.exit(1);
}

const api = axios.create({
  baseURL: STAGING_URL,
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

// Helper to create date strings
function dateString(daysFromNow: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

// Helper to create allocation
async function createAllocation(data: {
  resourceId: string;
  projectId: string;
  allocationPercentage: number;
  startDate: string;
  endDate: string;
  type?: string;
  bookingSource?: string;
  justification?: string;
}) {
  try {
    const response = await api.post('/api/resource-allocations', data);
    return { success: true, data: response.data };
  } catch (error) {
    const axiosError = error as AxiosError;
    return {
      success: false,
      status: axiosError.response?.status,
      message: axiosError.response?.data || axiosError.message,
    };
  }
}

// Helper to detect conflicts
async function detectConflicts(
  resourceId: string,
  startDate: string,
  endDate: string,
  allocationPercentage: number,
) {
  try {
    const response = await api.post('/api/resources/detect-conflicts', {
      resourceId,
      startDate,
      endDate,
      allocationPercentage,
    });
    return { success: true, data: response.data };
  } catch (error) {
    const axiosError = error as AxiosError;
    return {
      success: false,
      status: axiosError.response?.status,
      message: axiosError.response?.data || axiosError.message,
    };
  }
}

// Helper to get a project ID (create one if needed)
let testProjectId: string | null = null;

async function getOrCreateTestProject(): Promise<string> {
  if (testProjectId) return testProjectId;

  try {
    // Try to find an existing project
    const projectsResponse = await api.get('/api/projects', {
      params: { limit: 1 },
    });
    if (projectsResponse.data?.data?.[0]?.id) {
      testProjectId = projectsResponse.data.data[0].id;
      return testProjectId;
    }
  } catch (error) {
    // Continue to create
  }

  // Create a test project
  const createResponse = await api.post('/api/projects', {
    name: 'Resource Intelligence Test Project',
    workspaceId: ORGANIZATION_ID, // May need adjustment based on your API
  });
  testProjectId = createResponse.data.id;
  return testProjectId;
}

async function runTests() {
  console.log('🧪 Starting Resource Intelligence API Verification Tests\n');
  console.log(`📍 Staging URL: ${STAGING_URL}`);
  console.log(`🏢 Organization: ${ORGANIZATION_ID}`);
  console.log(`👤 Resource: ${RESOURCE_ID}\n`);

  const projectId = await getOrCreateTestProject();
  const startDate = dateString(1); // Tomorrow
  const endDate = dateString(7); // 7 days from now

  // Track created allocation IDs for cleanup
  const createdAllocationIds: string[] = [];

  try {
    // TEST 1: Baseline check - HARD allocation at 50%
    console.log('\n📋 TEST 1: Baseline check (HARD 50%)');
    const test1Result = await createAllocation({
      resourceId: RESOURCE_ID,
      projectId,
      allocationPercentage: 50,
      startDate,
      endDate,
      type: 'HARD',
      bookingSource: 'MANUAL',
    });

    if (!test1Result.success) {
      logTest('TEST 1: Create HARD allocation', false, test1Result.message as string);
    } else {
      createdAllocationIds.push(test1Result.data.id);
      const conflicts = await detectConflicts(
        RESOURCE_ID,
        startDate,
        endDate,
        0, // Check existing conflicts
      );

      if (conflicts.success) {
        const { hardLoad, softLoad, classification } = conflicts.data;
        const passed =
          hardLoad === 50 &&
          softLoad === 0 &&
          classification === 'NONE';
        logTest(
          'TEST 1: Baseline check',
          passed,
          passed
            ? undefined
            : `Expected: hardLoad=50, softLoad=0, classification=NONE. Got: hardLoad=${hardLoad}, softLoad=${softLoad}, classification=${classification}`,
          { hardLoad, softLoad, classification },
        );
      } else {
        logTest('TEST 1: Fetch conflicts', false, conflicts.message as string);
      }
    }

    // TEST 2: Warning zone with SOFT only
    console.log('\n📋 TEST 2: Warning zone (SOFT 40%)');
    const test2Result = await createAllocation({
      resourceId: RESOURCE_ID,
      projectId,
      allocationPercentage: 40,
      startDate,
      endDate,
      type: 'SOFT',
      bookingSource: 'MANUAL',
    });

    if (!test2Result.success) {
      logTest('TEST 2: Create SOFT allocation', false, test2Result.message as string);
    } else {
      createdAllocationIds.push(test2Result.data.id);
      const conflicts = await detectConflicts(
        RESOURCE_ID,
        startDate,
        endDate,
        0,
      );

      if (conflicts.success) {
        const { hardLoad, softLoad, classification } = conflicts.data;
        const passed =
          hardLoad === 50 &&
          softLoad === 40 &&
          classification === 'WARNING';
        logTest(
          'TEST 2: Warning zone',
          passed,
          passed
            ? undefined
            : `Expected: hardLoad=50, softLoad=40, classification=WARNING. Got: hardLoad=${hardLoad}, softLoad=${softLoad}, classification=${classification}`,
          { hardLoad, softLoad, classification },
        );
      } else {
        logTest('TEST 2: Fetch conflicts', false, conflicts.message as string);
      }
    }

    // TEST 3: Justification rule
    console.log('\n📋 TEST 3: Justification rule (HARD 30%, total 120%)');

    // First attempt without justification - should fail
    const test3aResult = await createAllocation({
      resourceId: RESOURCE_ID,
      projectId,
      allocationPercentage: 30,
      startDate,
      endDate,
      type: 'HARD',
      bookingSource: 'MANUAL',
      // No justification
    });

    if (test3aResult.success) {
      logTest(
        'TEST 3a: Rejection without justification',
        false,
        'Expected HTTP 400 but allocation was created',
      );
    } else {
      const is400 = test3aResult.status === 400;
      const hasJustificationMessage =
        String(test3aResult.message).toLowerCase().includes('justification') ||
        String(test3aResult.message).toLowerCase().includes('100');
      logTest(
        'TEST 3a: Rejection without justification',
        is400 && hasJustificationMessage,
        is400
          ? undefined
          : `Expected HTTP 400 with justification message. Got: ${test3aResult.status}`,
        { status: test3aResult.status, message: test3aResult.message },
      );
    }

    // Second attempt with justification - should succeed
    const test3bResult = await createAllocation({
      resourceId: RESOURCE_ID,
      projectId,
      allocationPercentage: 30,
      startDate,
      endDate,
      type: 'HARD',
      bookingSource: 'MANUAL',
      justification: 'Critical project requirement',
    });

    if (!test3bResult.success) {
      logTest(
        'TEST 3b: Success with justification',
        false,
        test3bResult.message as string,
      );
    } else {
      createdAllocationIds.push(test3bResult.data.id);
      logTest('TEST 3b: Success with justification', true);
    }

    // TEST 4: Hard cap rule
    console.log('\n📋 TEST 4: Hard cap rule (SOFT allocation pushing >150%)');
    const test4Result = await createAllocation({
      resourceId: RESOURCE_ID,
      projectId,
      allocationPercentage: 50, // This would push total to 170% (50+40+30+50)
      startDate,
      endDate,
      type: 'SOFT',
      bookingSource: 'MANUAL',
    });

    if (test4Result.success) {
      logTest(
        'TEST 4: Hard cap rejection',
        false,
        'Expected HTTP 400 but allocation was created',
      );
    } else {
      const is400 = test4Result.status === 400;
      const hasHardCapMessage =
        String(test4Result.message).toLowerCase().includes('hard cap') ||
        String(test4Result.message).toLowerCase().includes('150');
      logTest(
        'TEST 4: Hard cap rejection',
        is400 && hasHardCapMessage,
        is400
          ? undefined
          : `Expected HTTP 400 with hard cap message. Got: ${test4Result.status}`,
        { status: test4Result.status, message: test4Result.message },
      );
    }

    // TEST 5: GHOST safety
    console.log('\n📋 TEST 5: GHOST safety (GHOST 200% should not affect conflicts)');
    const conflictsBeforeGhost = await detectConflicts(
      RESOURCE_ID,
      startDate,
      endDate,
      0,
    );

    const test5Result = await createAllocation({
      resourceId: RESOURCE_ID,
      projectId,
      allocationPercentage: 200, // Very high GHOST allocation
      startDate,
      endDate,
      type: 'GHOST',
      bookingSource: 'AI',
    });

    if (!test5Result.success) {
      logTest('TEST 5: Create GHOST allocation', false, test5Result.message as string);
    } else {
      createdAllocationIds.push(test5Result.data.id);
      const conflictsAfterGhost = await detectConflicts(
        RESOURCE_ID,
        startDate,
        endDate,
        0,
      );

      if (conflictsAfterGhost.success && conflictsBeforeGhost.success) {
        const before = conflictsBeforeGhost.data;
        const after = conflictsAfterGhost.data;
        const passed =
          before.hardLoad === after.hardLoad &&
          before.softLoad === after.softLoad &&
          before.classification === after.classification;
        logTest(
          'TEST 5: GHOST safety',
          passed,
          passed
            ? undefined
            : `GHOST allocation affected conflicts. Before: hardLoad=${before.hardLoad}, softLoad=${before.softLoad}, classification=${before.classification}. After: hardLoad=${after.hardLoad}, softLoad=${after.softLoad}, classification=${after.classification}`,
          { before, after },
        );
      } else {
        logTest('TEST 5: Fetch conflicts', false, 'Failed to fetch conflicts');
      }
    }

    // Summary
    console.log('\n📊 Test Summary:');
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    console.log(`   ${passed}/${total} tests passed\n`);

    if (passed === total) {
      console.log('✅ All tests passed! Resource Intelligence is working correctly.\n');
    } else {
      console.log('❌ Some tests failed. Review the details above.\n');
    }

    // Cleanup: Delete created allocations
    console.log('🧹 Cleaning up test allocations...');
    for (const id of createdAllocationIds) {
      try {
        await api.delete(`/api/resource-allocations/${id}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    console.log('✅ Cleanup complete\n');
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});






