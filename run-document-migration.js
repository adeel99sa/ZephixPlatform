const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:IzCgTGNmVDQHunqICLyuUbMtfWaSMmL@ballast.proxy.rlwy.net:38318/railway'
});

async function runDocumentMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check if document tables already exist
    const checkTemplates = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'document_templates'
      );
    `);

    if (checkTemplates.rows[0].exists) {
      console.log('Document tables already exist, skipping migration');
      return;
    }

    // Create document templates table
    await client.query(`
      CREATE TABLE document_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('initiation', 'planning', 'execution', 'closure')),
        methodology VARCHAR(50) DEFAULT 'all' CHECK (methodology IN ('all', 'agile', 'waterfall', 'hybrid')),
        template_type VARCHAR(50) NOT NULL,
        description TEXT,
        fields JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_system BOOLEAN DEFAULT true,
        organization_id UUID REFERENCES organizations(id),
        created_by UUID REFERENCES users(id),
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Created document_templates table');

    // Create project documents table
    await client.query(`
      CREATE TABLE project_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        template_id UUID REFERENCES document_templates(id),
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        content JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
        version INTEGER DEFAULT 1,
        created_by UUID NOT NULL REFERENCES users(id),
        last_modified_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP WITHOUT TIME ZONE,
        organization_id UUID NOT NULL REFERENCES organizations(id),
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Created project_documents table');

    // Create document activity table
    await client.query(`
      CREATE TABLE document_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'edited', 'approved', 'rejected', 'commented')),
        details JSONB,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Created document_activity table');

    // Create indexes
    await client.query(`
      CREATE INDEX idx_project_documents_project ON project_documents(project_id);
      CREATE INDEX idx_project_documents_status ON project_documents(status);
      CREATE INDEX idx_project_documents_org ON project_documents(organization_id);
      CREATE INDEX idx_document_templates_category ON document_templates(category);
      CREATE INDEX idx_document_templates_methodology ON document_templates(methodology);
      CREATE INDEX idx_document_templates_org ON document_templates(organization_id);
      CREATE INDEX idx_document_activity_document ON document_activity(document_id);
    `);
    console.log('Created indexes');

    // Insert system templates
    const templates = [
      {
        name: 'Project Charter',
        category: 'initiation',
        methodology: 'all',
        template_type: 'project_charter',
        description: 'Formally authorizes project existence and provides PM authority',
        fields: {
          sections: [
            {
              id: 'basic_info',
              title: 'Project Information',
              fields: [
                { id: 'project_name', label: 'Project Name', type: 'text', required: true, autoFill: 'project.name' },
                { id: 'project_manager', label: 'Project Manager', type: 'text', required: true, autoFill: 'project.manager' },
                { id: 'start_date', label: 'Start Date', type: 'date', required: true, autoFill: 'project.startDate' },
                { id: 'end_date', label: 'End Date', type: 'date', required: true, autoFill: 'project.endDate' },
                { id: 'budget', label: 'Budget', type: 'currency', required: true, autoFill: 'project.budget' }
              ]
            }
          ]
        },
        is_system: true,
        version: 1
      },
      {
        name: 'Risk Register',
        category: 'planning',
        methodology: 'all',
        template_type: 'risk_register',
        description: 'Identify, assess, and track project risks',
        fields: {
          sections: [
            {
              id: 'project_info',
              title: 'Project Information',
              fields: [
                { id: 'project_name', label: 'Project Name', type: 'text', required: true, autoFill: 'project.name' },
                { id: 'last_updated', label: 'Last Updated', type: 'date', required: true, autoFill: 'today' }
              ]
            }
          ]
        },
        is_system: true,
        version: 1
      },
      {
        name: 'Status Report',
        category: 'execution',
        methodology: 'all',
        template_type: 'status_report',
        description: 'Weekly/Monthly project status update',
        fields: {
          sections: [
            {
              id: 'report_info',
              title: 'Report Information',
              fields: [
                { id: 'project_name', label: 'Project Name', type: 'text', required: true, autoFill: 'project.name' },
                { id: 'report_date', label: 'Report Date', type: 'date', required: true, autoFill: 'today' }
              ]
            }
          ]
        },
        is_system: true,
        version: 1
      }
    ];

    for (const template of templates) {
      await client.query(`
        INSERT INTO document_templates (name, category, methodology, template_type, description, fields, is_system, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        template.name,
        template.category,
        template.methodology,
        template.template_type,
        template.description,
        JSON.stringify(template.fields),
        template.is_system,
        template.version
      ]);
    }
    console.log('Inserted system templates');

    console.log('Document Center migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.end();
  }
}

runDocumentMigration();

