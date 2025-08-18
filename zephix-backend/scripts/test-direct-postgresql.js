#!/usr/bin/env node

const { Client } = require('pg');

async function testDirectPostgreSQLConnection() {
  console.log('🔍 TESTING DIRECT POSTGRESQL CONNECTION');
  console.log('=====================================');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    return;
  }
  
  console.log('📊 DATABASE_URL Analysis:');
  console.log(`   URL: ${databaseUrl}`);
  
  // Parse DATABASE_URL to extract SSL parameters
  try {
    const url = new URL(databaseUrl);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   Username: ${url.username}`);
    console.log(`   SSL Mode: ${url.searchParams.get('sslmode') || 'not specified'}`);
    console.log(`   SSL Root Cert: ${url.searchParams.get('sslrootcert') || 'not specified'}`);
    console.log(`   SSL Cert: ${url.searchParams.get('sslcert') || 'not specified'}`);
    console.log(`   SSL Key: ${url.searchParams.get('sslkey') || 'not specified'}`);
  } catch (error) {
    console.error('❌ Failed to parse DATABASE_URL:', error.message);
  }
  
  console.log('\n🔒 SSL CONFIGURATION TEST:');
  
  // Test 1: Default SSL configuration
  console.log('\n1️⃣ Testing with default SSL configuration...');
  try {
    const client1 = new Client({
      connectionString: databaseUrl,
    });
    
    await client1.connect();
    console.log('✅ SUCCESS: Default SSL configuration works');
    await client1.end();
  } catch (error) {
    console.log('❌ FAILED: Default SSL configuration');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
  }
  
  // Test 2: SSL rejectUnauthorized: false
  console.log('\n2️⃣ Testing with SSL rejectUnauthorized: false...');
  try {
    const client2 = new Client({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    
    await client2.connect();
    console.log('✅ SUCCESS: SSL rejectUnauthorized: false works');
    await client2.end();
  } catch (error) {
    console.log('❌ FAILED: SSL rejectUnauthorized: false');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
  }
  
  // Test 3: SSL with specific parameters
  console.log('\n3️⃣ Testing with specific SSL parameters...');
  try {
    const client3 = new Client({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
        ca: process.env.DATABASE_CA_CERT,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
      },
    });
    
    await client3.connect();
    console.log('✅ SUCCESS: Specific SSL parameters work');
    await client3.end();
  } catch (error) {
    console.log('❌ FAILED: Specific SSL parameters');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
  }
  
  // Test 4: Node.js SSL flags
  console.log('\n4️⃣ Testing with Node.js SSL flags...');
  try {
    // Set Node.js SSL flags
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    const client4 = new Client({
      connectionString: databaseUrl,
    });
    
    await client4.connect();
    console.log('✅ SUCCESS: Node.js SSL flags work');
    await client4.end();
    
    // Reset SSL flags
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  } catch (error) {
    console.log('❌ FAILED: Node.js SSL flags');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    
    // Reset SSL flags
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  }
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('Based on test results above, implement the working SSL configuration.');
}

// Run the test
testDirectPostgreSQLConnection().catch(console.error);

