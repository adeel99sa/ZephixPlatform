const fetch = require('node-fetch');

// Test document endpoints
const BASE_URL = 'http://localhost:3000';

async function testDocumentEndpoints() {
  console.log('🧪 Testing Document Center Endpoints...\n');

  try {
    // Test 1: Get templates
    console.log('1. Testing GET /api/documents/templates');
    const templatesResponse = await fetch(`${BASE_URL}/api/documents/templates`, {
      headers: {
        'Authorization': 'Bearer test-token', // You'll need a real token
        'Content-Type': 'application/json'
      }
    });
    
    if (templatesResponse.ok) {
      const templates = await templatesResponse.json();
      console.log('✅ Templates endpoint working');
      console.log(`   Found ${templates.length} templates`);
    } else {
      console.log('❌ Templates endpoint failed:', templatesResponse.status);
    }

    // Test 2: Get templates by category
    console.log('\n2. Testing GET /api/documents/templates?category=initiation');
    const categoryResponse = await fetch(`${BASE_URL}/api/documents/templates?category=initiation`, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    if (categoryResponse.ok) {
      const categoryTemplates = await categoryResponse.json();
      console.log('✅ Category filter working');
      console.log(`   Found ${categoryTemplates.length} initiation templates`);
    } else {
      console.log('❌ Category filter failed:', categoryResponse.status);
    }

    // Test 3: Get document stats
    console.log('\n3. Testing GET /api/documents/stats/overview');
    const statsResponse = await fetch(`${BASE_URL}/api/documents/stats/overview`, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ Stats endpoint working');
      console.log(`   Total documents: ${stats.total}`);
    } else {
      console.log('❌ Stats endpoint failed:', statsResponse.status);
    }

    console.log('\n🎉 Document Center endpoints test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up database connection');
    console.log('2. Run migrations to create document tables');
    console.log('3. Initialize document templates');
    console.log('4. Test document creation and editing');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 3000');
  }
}

// Run the test
testDocumentEndpoints();


