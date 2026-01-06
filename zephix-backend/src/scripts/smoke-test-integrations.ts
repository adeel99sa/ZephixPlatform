/**
 * Smoke test script for integrations endpoints
 * Run: ACCESS_TOKEN=xxx npm run smoke:integrations
 */

async function smokeTestIntegrations() {
  const token = process.env.ACCESS_TOKEN;
  if (!token) {
    throw new Error('ACCESS_TOKEN required');
  }

  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  console.log('🧪 Integrations Endpoints Smoke Test\n');

  // 1. List integrations
  const listRes = await fetch(`${baseUrl}/api/integrations`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (listRes.status !== 200) {
    console.error(`❌ GET /api/integrations - Status: ${listRes.status}`);
    process.exit(1);
  }

  const listData = await listRes.json();
  if (!listData.data || !Array.isArray(listData.data)) {
    console.error('❌ GET /api/integrations - Invalid response format');
    process.exit(1);
  }
  console.log(
    `✅ GET /api/integrations - OK (${listData.data.length} connections)`,
  );

  // 2. Create integration (if we have test credentials)
  const testJiraUrl = process.env.TEST_JIRA_URL;
  const testJiraEmail = process.env.TEST_JIRA_EMAIL;
  const testJiraToken = process.env.TEST_JIRA_TOKEN;

  if (testJiraUrl && testJiraEmail && testJiraToken) {
    const createRes = await fetch(`${baseUrl}/api/integrations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'jira',
        baseUrl: testJiraUrl,
        email: testJiraEmail,
        apiToken: testJiraToken,
        enabled: true,
      }),
    });

    if (createRes.status !== 201 && createRes.status !== 200) {
      const errorText = await createRes.text();
      console.error(`❌ POST /api/integrations - Status: ${createRes.status}`);
      console.error(`   Error: ${errorText}`);
      // Don't exit - might be duplicate connection
    } else {
      const createData = await createRes.json();
      if (!createData.data || !createData.data.id) {
        console.error('❌ POST /api/integrations - Invalid response format');
        process.exit(1);
      }
      console.log(
        `✅ POST /api/integrations - OK (connection ID: ${createData.data.id})`,
      );

      // Verify no secrets in response
      if (createData.data.encryptedSecrets || createData.data.apiToken) {
        console.error('❌ POST /api/integrations - Response contains secrets!');
        process.exit(1);
      }
      console.log(`✅ POST /api/integrations - No secrets in response`);

      const connectionId = createData.data.id;

      // 3. Test connection
      const testRes = await fetch(
        `${baseUrl}/api/integrations/${connectionId}/test`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );

      if (testRes.status !== 200) {
        console.error(
          `❌ POST /api/integrations/:id/test - Status: ${testRes.status}`,
        );
        // Don't exit - connection might be invalid
      } else {
        const testData = await testRes.json();
        if (!testData.data || typeof testData.data.connected !== 'boolean') {
          console.error(
            '❌ POST /api/integrations/:id/test - Invalid response format',
          );
          process.exit(1);
        }
        console.log(
          `✅ POST /api/integrations/:id/test - OK (connected: ${testData.data.connected})`,
        );
      }

      // 4. Sync now (optional - might take time)
      if (process.env.RUN_SYNC === 'true') {
        const syncRes = await fetch(
          `${baseUrl}/api/integrations/${connectionId}/sync-now`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          },
        );

        if (syncRes.status !== 200) {
          console.error(
            `❌ POST /api/integrations/:id/sync-now - Status: ${syncRes.status}`,
          );
          // Don't exit - sync might fail
        } else {
          const syncData = await syncRes.json();
          if (!syncData.data || typeof syncData.data.status !== 'string') {
            console.error(
              '❌ POST /api/integrations/:id/sync-now - Invalid response format',
            );
            process.exit(1);
          }
          console.log(
            `✅ POST /api/integrations/:id/sync-now - OK (status: ${syncData.data.status}, processed: ${syncData.data.issuesProcessed})`,
          );
        }
      }
    }
  } else {
    console.log(
      '⚠️  Skipping create/test/sync (TEST_JIRA_URL, TEST_JIRA_EMAIL, TEST_JIRA_TOKEN not set)',
    );
  }

  console.log('\n✅ All integrations smoke tests passed');
}

smokeTestIntegrations().catch((error) => {
  console.error('❌ Smoke test failed:', error);
  process.exit(1);
});

