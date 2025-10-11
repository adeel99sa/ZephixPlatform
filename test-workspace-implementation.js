#!/usr/bin/env node

/**
 * Test script to verify workspace implementation
 * This script tests the workspace API endpoints
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testWorkspaceImplementation() {
  console.log('🧪 Testing Workspace Implementation...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1. Testing backend connectivity...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Backend is running');
    console.log(`   Status: ${healthResponse.status}`);
    console.log();

    // Test 2: Test workspace endpoints (without auth - should get 401)
    console.log('2. Testing workspace endpoints (expecting 401 without auth)...');
    
    try {
      await axios.get(`${API_BASE}/workspaces/my-workspaces`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Workspace endpoint is protected (401 Unauthorized)');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    try {
      await axios.get(`${API_BASE}/projects`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Projects endpoint is protected (401 Unauthorized)');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    console.log();

    // Test 3: Check if frontend is running
    console.log('3. Testing frontend connectivity...');
    try {
      const frontendResponse = await axios.get('http://localhost:5173');
      console.log('✅ Frontend is running');
      console.log(`   Status: ${frontendResponse.status}`);
    } catch (error) {
      console.log('❌ Frontend not accessible:', error.message);
    }

    console.log();
    console.log('🎉 Workspace implementation test completed!');
    console.log();
    console.log('Next steps:');
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. Login to the application');
    console.log('3. Check if workspace selector appears in the sidebar');
    console.log('4. Test workspace switching functionality');
    console.log('5. Verify projects are filtered by selected workspace');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testWorkspaceImplementation();













