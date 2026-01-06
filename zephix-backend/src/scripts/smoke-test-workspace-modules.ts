/**
 * Smoke test script for workspace modules endpoints
 * Run: ACCESS_TOKEN=xxx npm run smoke:workspace-modules
 */

async function smokeTestWorkspaceModules() {
  const token = process.env.ACCESS_TOKEN;
  if (!token) {
    throw new Error('ACCESS_TOKEN required');
  }

  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  const workspaceId = process.env.WORKSPACE_ID || 'test-workspace-id';

  console.log('🧪 Workspace Modules Endpoints Smoke Test\n');

  // 1. List modules
  const listRes = await fetch(
    `${baseUrl}/api/workspaces/${workspaceId}/modules`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (listRes.status !== 200) {
    console.error(
      `❌ GET /api/workspaces/:id/modules - Status: ${listRes.status}`,
    );
    process.exit(1);
  }

  const listData = await listRes.json();
  if (!listData.data || !Array.isArray(listData.data)) {
    console.error(
      '❌ GET /api/workspaces/:id/modules - Invalid response format',
    );
    process.exit(1);
  }
  console.log(
    `✅ GET /api/workspaces/:id/modules - OK (${listData.data.length} modules)`,
  );

  // 2. Get single module
  const moduleKey = listData.data[0]?.moduleKey || 'resource_intelligence';
  const getRes = await fetch(
    `${baseUrl}/api/workspaces/${workspaceId}/modules/${moduleKey}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (getRes.status !== 200) {
    console.error(
      `❌ GET /api/workspaces/:id/modules/:key - Status: ${getRes.status}`,
    );
    process.exit(1);
  }

  const getData = await getRes.json();
  if (!getData.data || !getData.data.moduleKey) {
    console.error(
      '❌ GET /api/workspaces/:id/modules/:key - Invalid response format',
    );
    process.exit(1);
  }
  console.log(`✅ GET /api/workspaces/:id/modules/:key - OK`);

  console.log('\n✅ All workspace modules smoke tests passed');
}

smokeTestWorkspaceModules().catch((error) => {
  console.error('❌ Smoke test failed:', error);
  process.exit(1);
});

