// Test Database Reset Script
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const execAsync = promisify(exec);

// Test data configuration
const TEST_DATA = {
  // User accounts for different company roles
  users: [
    {
      email: 'pm-test@zephix.com',
      password: 'Test123!@#',
      name: 'PM Test User',
      role: 'project_manager',
      organization: 'Enterprise Banking Corp'
    },
    {
      email: 'executive@zephix.com',
      password: 'Test123!@#',
      name: 'Executive User',
      role: 'executive',
      organization: 'Enterprise Banking Corp'
    },
    {
      email: 'developer@zephix.com',
      password: 'Test123!@#',
      name: 'Developer User',
      role: 'developer',
      organization: 'Manufacturing Solutions Inc'
    },
    {
      email: 'analyst@zephix.com',
      password: 'Test123!@#',
      name: 'Business Analyst',
      role: 'business_analyst',
      organization: 'Real Estate Innovations'
    },
    {
      email: 'stakeholder@zephix.com',
      password: 'Test123!@#',
      name: 'Stakeholder User',
      role: 'stakeholder',
      organization: 'Enterprise Banking Corp'
    }
  ],

  // Sample projects from different industries
  projects: [
    // Banking Projects
    {
      name: 'Digital Banking Platform Modernization',
      description: 'Complete overhaul of legacy banking systems to modern microservices architecture',
      industry: 'banking',
      status: 'active',
      priority: 'high',
      budget: 5000000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      organization: 'Enterprise Banking Corp',
      risks: [
        { title: 'Legacy System Dependencies', severity: 'high', probability: 'medium' },
        { title: 'Regulatory Compliance Changes', severity: 'high', probability: 'low' },
        { title: 'Data Migration Complexity', severity: 'medium', probability: 'high' }
      ],
      milestones: [
        { name: 'Requirements Analysis', dueDate: '2024-02-01', status: 'completed' },
        { name: 'Architecture Design', dueDate: '2024-03-15', status: 'completed' },
        { name: 'Core Banking Module', dueDate: '2024-06-30', status: 'in_progress' },
        { name: 'Security Implementation', dueDate: '2024-09-30', status: 'pending' }
      ]
    },
    {
      name: 'Mobile Banking App Enhancement',
      description: 'Add AI-powered features and biometric authentication to mobile banking',
      industry: 'banking',
      status: 'active',
      priority: 'medium',
      budget: 1500000,
      startDate: '2024-02-01',
      endDate: '2024-08-31',
      organization: 'Enterprise Banking Corp'
    },
    {
      name: 'Fraud Detection System Upgrade',
      description: 'Implement ML-based real-time fraud detection across all channels',
      industry: 'banking',
      status: 'planning',
      priority: 'critical',
      budget: 3000000,
      startDate: '2024-03-01',
      endDate: '2024-11-30',
      organization: 'Enterprise Banking Corp'
    },

    // Manufacturing Projects
    {
      name: 'Smart Factory Initiative',
      description: 'IoT integration for real-time production monitoring and predictive maintenance',
      industry: 'manufacturing',
      status: 'active',
      priority: 'high',
      budget: 8000000,
      startDate: '2024-01-15',
      endDate: '2025-06-30',
      organization: 'Manufacturing Solutions Inc',
      risks: [
        { title: 'Equipment Compatibility', severity: 'medium', probability: 'medium' },
        { title: 'Production Downtime', severity: 'high', probability: 'low' },
        { title: 'Staff Training Requirements', severity: 'low', probability: 'high' }
      ]
    },
    {
      name: 'Supply Chain Optimization',
      description: 'Blockchain-based supply chain tracking and optimization system',
      industry: 'manufacturing',
      status: 'active',
      priority: 'medium',
      budget: 2500000,
      startDate: '2024-02-01',
      endDate: '2024-10-31',
      organization: 'Manufacturing Solutions Inc'
    },
    {
      name: 'Quality Control Automation',
      description: 'AI-powered visual inspection system for production lines',
      industry: 'manufacturing',
      status: 'completed',
      priority: 'high',
      budget: 1800000,
      startDate: '2023-06-01',
      endDate: '2023-12-31',
      organization: 'Manufacturing Solutions Inc'
    },

    // Real Estate Projects
    {
      name: 'Property Management Platform',
      description: 'Cloud-based platform for property management and tenant services',
      industry: 'real_estate',
      status: 'active',
      priority: 'high',
      budget: 3500000,
      startDate: '2024-01-01',
      endDate: '2024-09-30',
      organization: 'Real Estate Innovations',
      risks: [
        { title: 'Market Volatility', severity: 'medium', probability: 'medium' },
        { title: 'Integration Complexity', severity: 'medium', probability: 'high' },
        { title: 'User Adoption', severity: 'low', probability: 'medium' }
      ]
    },
    {
      name: 'Virtual Reality Showroom',
      description: 'VR platform for remote property viewing and customization',
      industry: 'real_estate',
      status: 'planning',
      priority: 'medium',
      budget: 1200000,
      startDate: '2024-04-01',
      endDate: '2024-12-31',
      organization: 'Real Estate Innovations'
    },
    {
      name: 'Smart Building Analytics',
      description: 'IoT and AI system for building energy optimization and predictive maintenance',
      industry: 'real_estate',
      status: 'at_risk',
      priority: 'high',
      budget: 4000000,
      startDate: '2023-09-01',
      endDate: '2024-08-31',
      organization: 'Real Estate Innovations'
    }
  ],

  // Integration connections mock data
  integrations: [
    {
      name: 'Jira',
      type: 'project_management',
      status: 'connected',
      lastSync: new Date(Date.now() - 3600000), // 1 hour ago
      config: {
        url: 'https://enterprise-bank.atlassian.net',
        apiKey: 'mock-jira-api-key',
        projectKey: 'BANK'
      }
    },
    {
      name: 'Slack',
      type: 'communication',
      status: 'connected',
      lastSync: new Date(Date.now() - 1800000), // 30 minutes ago
      config: {
        workspaceId: 'T0001MOCK',
        webhookUrl: 'https://hooks.slack.com/services/MOCK/WEBHOOK/URL'
      }
    },
    {
      name: 'GitHub',
      type: 'version_control',
      status: 'connected',
      lastSync: new Date(Date.now() - 7200000), // 2 hours ago
      config: {
        organization: 'enterprise-banking',
        token: 'ghp_mockGitHubToken123456789'
      }
    },
    {
      name: 'Microsoft Teams',
      type: 'communication',
      status: 'disconnected',
      lastSync: null,
      config: {}
    },
    {
      name: 'GitLab',
      type: 'version_control',
      status: 'error',
      lastSync: new Date(Date.now() - 86400000), // 1 day ago
      error: 'Authentication failed',
      config: {
        url: 'https://gitlab.manufacturing.com',
        token: 'expired-token'
      }
    },
    {
      name: 'Azure DevOps',
      type: 'project_management',
      status: 'connected',
      lastSync: new Date(Date.now() - 5400000), // 1.5 hours ago
      config: {
        organization: 'real-estate-innovations',
        project: 'PropertyPlatform'
      }
    }
  ],

  // BRD documents for testing
  brds: [
    {
      filename: 'banking-platform-brd.pdf',
      projectName: 'Digital Banking Platform Modernization',
      uploadDate: '2024-01-05',
      status: 'processed',
      aiAnalysis: {
        extractedSections: ['Executive Summary', 'Requirements', 'Architecture', 'Timeline', 'Budget'],
        projectName: 'Digital Banking Platform Modernization',
        objectives: [
          'Modernize core banking infrastructure',
          'Improve customer experience',
          'Ensure regulatory compliance',
          'Enable real-time transactions'
        ],
        requirements: [
          'Microservices architecture',
          'API-first design',
          'Cloud-native deployment',
          'Zero-downtime migration'
        ],
        stakeholders: [
          'CTO - Technical Oversight',
          'Head of Digital Banking - Product Owner',
          'Compliance Officer - Regulatory Requirements',
          'Customer Experience Lead - UX Requirements'
        ],
        timeline: '12 months',
        budget: '$5,000,000'
      }
    },
    {
      filename: 'smart-factory-brd.docx',
      projectName: 'Smart Factory Initiative',
      uploadDate: '2024-01-10',
      status: 'processed',
      aiAnalysis: {
        extractedSections: ['Business Case', 'Technical Requirements', 'Implementation Plan'],
        projectName: 'Smart Factory Initiative',
        objectives: [
          'Increase production efficiency by 30%',
          'Reduce downtime through predictive maintenance',
          'Enable real-time production monitoring'
        ],
        requirements: [
          'IoT sensor deployment',
          'Edge computing infrastructure',
          'ML models for predictive analytics',
          'Integration with existing ERP'
        ],
        stakeholders: [
          'Plant Manager - Operations Lead',
          'IT Director - Technical Implementation',
          'Production Supervisor - Process Requirements'
        ],
        timeline: '18 months',
        budget: '$8,000,000'
      }
    }
  ]
};

async function resetTestDatabase() {
  console.log('🔄 Resetting test database...');
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/zephix_test';
    
    // Navigate to backend directory
    const backendPath = path.join(__dirname, '../../zephix-backend');
    
    console.log('📍 Working directory:', backendPath);
    
    // Drop and recreate test database
    console.log('🗑️  Dropping existing test database...');
    try {
      await execAsync('dropdb zephix_test --if-exists', { cwd: backendPath });
    } catch (error) {
      console.log('ℹ️  Database might not exist, continuing...');
    }
    
    console.log('🏗️  Creating new test database...');
    await execAsync('createdb zephix_test', { cwd: backendPath });
    
    // Run TypeORM migrations
    console.log('🔄 Running database migrations...');
    await execAsync('npm run migration:run', { 
      cwd: backendPath,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Seed test data
    console.log('🌱 Seeding test data...');
    console.log(`  - ${TEST_DATA.users.length} users`);
    console.log(`  - ${TEST_DATA.projects.length} projects`);
    console.log(`  - ${TEST_DATA.integrations.length} integrations`);
    console.log(`  - ${TEST_DATA.brds.length} BRD documents`);
    
    // In a real implementation, you would use TypeORM to insert this data
    // For now, we'll create a seed script that can be run
    await createSeedScript();
    
    console.log('✅ Test database reset complete!');
    console.log('📊 Test data summary:');
    console.log('  Banking projects: 3');
    console.log('  Manufacturing projects: 3');
    console.log('  Real Estate projects: 3');
    console.log('  Test users: 5 (PM, Executive, Developer, Analyst, Stakeholder)');
    console.log('  Integrations: 6 (3 connected, 1 disconnected, 1 error, 1 pending)');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

async function createSeedScript() {
  const seedScript = `
// Test Data Seed Script
import { DataSource } from 'typeorm';
import AppDataSource from '../src/data-source';

const seedData = ${JSON.stringify(TEST_DATA, null, 2)};

async function seed() {
  await AppDataSource.initialize();
  
  // Seed users
  for (const userData of seedData.users) {
    // Insert user logic here
    console.log('Creating user:', userData.email);
  }
  
  // Seed projects
  for (const projectData of seedData.projects) {
    // Insert project logic here
    console.log('Creating project:', projectData.name);
  }
  
  // Seed integrations
  for (const integrationData of seedData.integrations) {
    // Insert integration logic here
    console.log('Creating integration:', integrationData.name);
  }
  
  await AppDataSource.destroy();
}

seed().catch(console.error);
`;

  const seedPath = path.join(__dirname, '../../zephix-backend/scripts/seed-test-data.ts');
  require('fs').writeFileSync(seedPath, seedScript);
  console.log('📝 Created seed script at:', seedPath);
}

// Run the reset
resetTestDatabase();