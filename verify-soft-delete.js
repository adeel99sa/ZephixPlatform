#!/usr/bin/env node

/**
 * Verification script for soft-delete functionality
 * Tests the complete flow: create → list → soft delete → list → trash → restore → list
 */

const { execSync } = require('child_process');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ AUTH_TOKEN environment variable required');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

function apiCall(method, endpoint, data = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers,
    ...(data && { body: JSON.stringify(data) })
  };
  
  try {
    const response = execSync(`curl -s -X ${method} "${url}" ${data ? `-d '${JSON.stringify(data)}'` : ''} -H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json"`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return JSON.parse(response);
  } catch (error) {
    console.error(`❌ API call failed: ${method} ${endpoint}`);
    console.error(error.message);
    return null;
  }
}

async function runVerification() {
  console.log('🧪 Starting soft-delete verification...\n');
  
  // Step 1: Create workspace
  console.log('1️⃣ Creating test workspace...');
  const createResponse = apiCall('POST', '/workspaces', {
    name: 'Soft Delete Test Workspace',
    slug: 'soft-delete-test',
    isPrivate: false
  });
  
  if (!createResponse || !createResponse.id) {
    console.error('❌ Failed to create workspace');
    return;
  }
  
  const workspaceId = createResponse.id;
  console.log(`✅ Created workspace: ${workspaceId}`);
  
  // Step 2: List active workspaces (should include our new one)
  console.log('\n2️⃣ Listing active workspaces...');
  const activeList = apiCall('GET', '/workspaces');
  const activeCount = activeList ? activeList.length : 0;
  const ourWorkspace = activeList ? activeList.find(w => w.id === workspaceId) : null;
  
  console.log(`✅ Found ${activeCount} active workspaces`);
  console.log(`✅ Our workspace is ${ourWorkspace ? 'present' : 'missing'} in active list`);
  
  if (!ourWorkspace) {
    console.error('❌ Our workspace not found in active list');
    return;
  }
  
  // Step 3: Soft delete the workspace
  console.log('\n3️⃣ Soft deleting workspace...');
  const deleteResponse = apiCall('DELETE', `/workspaces/${workspaceId}`);
  
  if (!deleteResponse || deleteResponse.id !== workspaceId) {
    console.error('❌ Failed to soft delete workspace');
    return;
  }
  
  console.log('✅ Workspace soft deleted');
  
  // Step 4: List active workspaces (should NOT include our deleted one)
  console.log('\n4️⃣ Listing active workspaces after soft delete...');
  const activeListAfter = apiCall('GET', '/workspaces');
  const activeCountAfter = activeListAfter ? activeListAfter.length : 0;
  const ourWorkspaceAfter = activeListAfter ? activeListAfter.find(w => w.id === workspaceId) : null;
  
  console.log(`✅ Found ${activeCountAfter} active workspaces (was ${activeCount})`);
  console.log(`✅ Our workspace is ${ourWorkspaceAfter ? 'still present' : 'correctly hidden'} in active list`);
  
  if (ourWorkspaceAfter) {
    console.error('❌ Soft-deleted workspace still appears in active list');
    return;
  }
  
  // Step 5: List trash (should include our deleted workspace)
  console.log('\n5️⃣ Listing trash...');
  const trashList = apiCall('GET', '/admin/trash?type=workspace');
  const trashCount = trashList ? trashList.length : 0;
  const ourWorkspaceInTrash = trashList ? trashList.find(w => w.id === workspaceId) : null;
  
  console.log(`✅ Found ${trashCount} items in trash`);
  console.log(`✅ Our workspace is ${ourWorkspaceInTrash ? 'present' : 'missing'} in trash`);
  
  if (!ourWorkspaceInTrash) {
    console.error('❌ Soft-deleted workspace not found in trash');
    return;
  }
  
  // Step 6: Restore the workspace
  console.log('\n6️⃣ Restoring workspace...');
  const restoreResponse = apiCall('POST', `/workspaces/${workspaceId}/restore`);
  
  if (!restoreResponse || restoreResponse.id !== workspaceId) {
    console.error('❌ Failed to restore workspace');
    return;
  }
  
  console.log('✅ Workspace restored');
  
  // Step 7: List active workspaces (should include our restored one)
  console.log('\n7️⃣ Listing active workspaces after restore...');
  const activeListRestored = apiCall('GET', '/workspaces');
  const activeCountRestored = activeListRestored ? activeListRestored.length : 0;
  const ourWorkspaceRestored = activeListRestored ? activeListRestored.find(w => w.id === workspaceId) : null;
  
  console.log(`✅ Found ${activeCountRestored} active workspaces (was ${activeCountAfter})`);
  console.log(`✅ Our workspace is ${ourWorkspaceRestored ? 'present' : 'missing'} in active list`);
  
  if (!ourWorkspaceRestored) {
    console.error('❌ Restored workspace not found in active list');
    return;
  }
  
  // Step 8: List trash (should NOT include our restored workspace)
  console.log('\n8️⃣ Listing trash after restore...');
  const trashListAfter = apiCall('GET', '/admin/trash?type=workspace');
  const trashCountAfter = trashListAfter ? trashListAfter.length : 0;
  const ourWorkspaceInTrashAfter = trashListAfter ? trashListAfter.find(w => w.id === workspaceId) : null;
  
  console.log(`✅ Found ${trashCountAfter} items in trash (was ${trashCount})`);
  console.log(`✅ Our workspace is ${ourWorkspaceInTrashAfter ? 'still present' : 'correctly removed'} from trash`);
  
  if (ourWorkspaceInTrashAfter) {
    console.error('❌ Restored workspace still appears in trash');
    return;
  }
  
  // Step 9: Clean up - hard delete the workspace
  console.log('\n9️⃣ Cleaning up - hard deleting workspace...');
  const purgeResponse = apiCall('POST', '/admin/trash/purge', { id: workspaceId });
  
  if (!purgeResponse || purgeResponse.id !== workspaceId) {
    console.error('❌ Failed to purge workspace');
    return;
  }
  
  console.log('✅ Workspace purged');
  
  // Final verification
  console.log('\n🔍 Final verification...');
  const finalActiveList = apiCall('GET', '/workspaces');
  const finalTrashList = apiCall('GET', '/admin/trash?type=workspace');
  const finalActiveCount = finalActiveList ? finalActiveList.length : 0;
  const finalTrashCount = finalTrashList ? finalTrashList.length : 0;
  const ourWorkspaceFinal = finalActiveList ? finalActiveList.find(w => w.id === workspaceId) : null;
  const ourWorkspaceInTrashFinal = finalTrashList ? finalTrashList.find(w => w.id === workspaceId) : null;
  
  console.log(`✅ Final state: ${finalActiveCount} active, ${finalTrashCount} in trash`);
  console.log(`✅ Our workspace is ${ourWorkspaceFinal ? 'still present' : 'correctly absent'} from active list`);
  console.log(`✅ Our workspace is ${ourWorkspaceInTrashFinal ? 'still present' : 'correctly absent'} from trash`);
  
  if (ourWorkspaceFinal || ourWorkspaceInTrashFinal) {
    console.error('❌ Workspace still exists after purge');
    return;
  }
  
  console.log('\n🎉 All soft-delete verification tests passed!');
  console.log('\n📊 Summary:');
  console.log(`   • Created workspace: ✅`);
  console.log(`   • Active list includes created: ✅`);
  console.log(`   • Soft delete works: ✅`);
  console.log(`   • Active list excludes deleted: ✅`);
  console.log(`   • Trash includes deleted: ✅`);
  console.log(`   • Restore works: ✅`);
  console.log(`   • Active list includes restored: ✅`);
  console.log(`   • Trash excludes restored: ✅`);
  console.log(`   • Purge works: ✅`);
  console.log(`   • Final cleanup: ✅`);
}

runVerification().catch(console.error);
