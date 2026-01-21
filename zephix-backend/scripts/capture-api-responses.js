#!/usr/bin/env node

/**
 * Capture API Responses
 * Makes authenticated API calls and outputs the JSON responses
 */

require('dotenv').config();

const email = process.argv[2] || 'adeel99sa@yahoo.com';
const password = process.argv[3] || 'ReAdY4wK73967#!@';
const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function captureResponses() {
  console.log('🔍 Capturing API Responses\n');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Email: ${email}\n`);

  try {
    // Step 1: Login to get token
    console.log('1️⃣ Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      const error = await loginRes.text();
      console.error('❌ Login failed:', error);
      process.exit(1);
    }

    const loginData = await loginRes.json();
    const accessToken = loginData?.data?.accessToken || loginData?.accessToken;
    
    if (!accessToken) {
      console.error('❌ No access token in login response');
      console.log('Login response:', JSON.stringify(loginData, null, 2));
      process.exit(1);
    }

    console.log('✅ Login successful\n');

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Step 2: GET /api/my-work
    console.log('2️⃣ GET /api/my-work');
    console.log('─'.repeat(50));
    const myWorkRes = await fetch(`${baseUrl}/my-work`, { headers });
    
    if (!myWorkRes.ok) {
      const error = await myWorkRes.text();
      console.error('❌ GET /api/my-work failed:', error);
    } else {
      const myWorkData = await myWorkRes.json();
      console.log(JSON.stringify(myWorkData, null, 2));
    }
    console.log('─'.repeat(50));
    console.log('');

    // Step 3: POST /api/workspaces (create workspace)
    console.log('3️⃣ POST /api/workspaces');
    console.log('─'.repeat(50));
    const createWorkspaceRes = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Test Workspace ${Date.now()}`,
        description: 'Test workspace for API response capture',
      }),
    });

    if (!createWorkspaceRes.ok) {
      const error = await createWorkspaceRes.text();
      console.error('❌ POST /api/workspaces failed:', error);
    } else {
      const createWorkspaceData = await createWorkspaceRes.json();
      console.log(JSON.stringify(createWorkspaceData, null, 2));
    }
    console.log('─'.repeat(50));
    console.log('');

    console.log('✅ All API calls completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure:');
      console.log('   1. Backend is running on', baseUrl);
      console.log('   2. Node.js version supports fetch (18+) or install node-fetch');
    }
    process.exit(1);
  }
}

captureResponses();
