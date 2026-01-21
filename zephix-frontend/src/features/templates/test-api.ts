/**
 * Quick test script for templates API
 * Run in browser console or Node with ts-node
 */

import { listTemplates } from './templates.api';

// Test listTemplates
async function testListTemplates() {
  try {
    console.log('Testing listTemplates...');
    const templates = await listTemplates();
    console.log('✅ listTemplates succeeded');
    console.log(`Found ${templates.length} templates`);
    console.log('Sample template:', templates[0]);
    return templates;
  } catch (error) {
    console.error('❌ listTemplates failed:', error);
    throw error;
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testTemplatesAPI = { testListTemplates };
}

export { testListTemplates };
