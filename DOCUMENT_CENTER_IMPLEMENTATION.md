# Document Center Implementation

## Overview

The Document Center provides a comprehensive document management system for Zephix, enabling project managers to create, manage, and collaborate on project documents using smart templates and auto-population features.

## Features

### 🎯 Core Features
- **Smart Template System**: Pre-built templates for all project phases
- **Auto-Population**: Automatically fills project data from existing projects
- **Project Attachment**: Smart attachment to projects with confirmation prompts
- **Quick Creation**: Cmd+K command palette integration
- **Real-time Editing**: Inline document editing with auto-save
- **Version Control**: Document versioning and change tracking
- **Activity Logging**: Complete audit trail of document activities

### 📋 Document Templates

#### Initiation Phase
- **Project Charter**: Formal project authorization document
- **Business Case**: Justification and objectives
- **Stakeholder Analysis**: Key stakeholders and their roles

#### Planning Phase
- **Risk Register**: Comprehensive risk identification and management
- **Sprint Planning** (Agile): Sprint goals and user stories
- **Project Plan**: Detailed project planning document

#### Execution Phase
- **Status Reports**: Weekly/monthly progress updates
- **Sprint Retrospectives** (Agile): Team reflection and improvements
- **Issue Log**: Problem tracking and resolution

#### Closure Phase
- **Lessons Learned**: Project insights and recommendations
- **Project Closure**: Final project summary

## Technical Implementation

### Backend Architecture

#### Database Schema
```sql
-- Document templates table
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- initiation, planning, execution, closure
  methodology VARCHAR(50) DEFAULT 'all', -- all, agile, waterfall, hybrid
  template_type VARCHAR(50) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL, -- Template structure
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id),
  created_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Project documents table
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id),
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL, -- Filled template content
  status VARCHAR(20) DEFAULT 'draft', -- draft, review, approved, archived
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL REFERENCES users(id),
  last_modified_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Document activity log
CREATE TABLE document_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- created, edited, approved, rejected, commented
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/templates` | Get available templates |
| GET | `/api/documents/templates/:id` | Get template by ID |
| POST | `/api/documents/create-from-template` | Create document from template |
| POST | `/api/documents/:id/attach-to-project` | Attach document to project |
| PUT | `/api/documents/:id` | Update document content |
| GET | `/api/documents/project/:projectId` | Get project documents |
| GET | `/api/documents/:id` | Get document by ID |
| POST | `/api/documents/quick-create` | Quick create via command |
| PUT | `/api/documents/:id/status` | Change document status |
| GET | `/api/documents/stats/overview` | Get document statistics |
| GET | `/api/documents/:id/activity` | Get document activity log |

### Frontend Architecture

#### Components Structure
```
src/pages/documents/
├── DocumentCenterPage.tsx          # Main document center page
└── components/
    ├── TemplateCard.tsx            # Template selection card
    ├── DocumentEditor.tsx          # Document editing interface
    ├── AttachProjectModal.tsx      # Project attachment modal
    └── TemplateFormModal.tsx       # Template creation form
```

#### Key Features
- **Template Gallery**: Categorized template browsing
- **Smart Search**: Search templates by name and description
- **Auto-Save**: Automatic saving every 30 seconds
- **Real-time Validation**: Form validation and error handling
- **Responsive Design**: Mobile-friendly interface

## Usage Guide

### Creating Documents

#### Method 1: Document Center
1. Navigate to `/documents`
2. Browse templates by category
3. Click on a template card
4. Fill in basic information
5. Choose to attach to project or create standalone

#### Method 2: Command Palette (Cmd+K)
1. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows)
2. Type "create [document type]"
3. Enter project ID when prompted
4. Document is created and opened for editing

#### Method 3: Project Integration
1. Go to project detail page
2. Click "Documents" tab
3. Click "New Document (⌘K)"
4. Select template and create

### Document Editing

#### Features
- **Auto-Save**: Changes saved automatically every 30 seconds
- **Version Control**: Each save creates a new version
- **Field Types**: Support for text, textarea, date, select, list, table, etc.
- **Validation**: Required field validation
- **Status Management**: Draft, Review, Approved, Archived

#### Field Types Supported
- **Text**: Single-line text input
- **Textarea**: Multi-line text input
- **Date**: Date picker
- **Number**: Numeric input with min/max
- **Select**: Dropdown selection
- **List**: Dynamic list of items
- **Table**: Dynamic table with columns
- **Date Range**: Start and end date selection
- **Signature**: Digital signature (placeholder)

### Project Attachment

#### Smart Attachment Process
1. When creating a document with a project name, system searches for matching projects
2. If exactly one match found, shows attachment confirmation modal
3. User can choose to attach, skip, or cancel
4. Attached documents appear in project's document tab

#### Benefits
- **Centralized Access**: All project documents in one place
- **Collaboration**: Team members can access and edit documents
- **Context**: Documents have project context and metadata
- **Organization**: Better document organization and discovery

## Configuration

### Template Customization

Templates are defined in `src/modules/documents/templates/template-definitions.ts`:

```typescript
export const DOCUMENT_TEMPLATES = {
  PROJECT_CHARTER: {
    name: 'Project Charter',
    category: 'initiation',
    templateType: 'project_charter',
    methodology: 'all',
    description: 'Formally authorizes project existence',
    fields: {
      sections: [
        {
          id: 'basic_info',
          title: 'Project Information',
          fields: [
            { 
              id: 'project_name', 
              label: 'Project Name', 
              type: 'text', 
              required: true, 
              autoFill: 'project.name' 
            },
            // ... more fields
          ]
        }
      ]
    }
  }
};
```

### Auto-Fill Configuration

Auto-fill fields are configured using the `autoFill` property:

- `project.name`: Project name
- `project.manager`: Project manager name
- `project.startDate`: Project start date
- `project.endDate`: Project end date
- `project.budget`: Project budget
- `project.dates`: Project date range
- `today`: Current date
- `current_user`: Current user name

## Testing

### Backend Testing
```bash
# Run the test script
./test-document-center.sh

# Test specific endpoints
curl -X GET http://localhost:3000/api/documents/templates
curl -X GET http://localhost:3000/api/documents/stats/overview
```

### Frontend Testing
```bash
cd zephix-frontend
npm run build
npm run test
```

## Deployment

### Database Migration
1. Run the migration to create document tables
2. Initialize system templates
3. Set up proper indexes for performance

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@host:port/database
DB_SSL=require
```

### Production Considerations
- **Performance**: Add database indexes for large document sets
- **Storage**: Consider document storage strategy for large files
- **Backup**: Regular backup of document content
- **Security**: Proper access controls and audit logging

## Future Enhancements

### Planned Features
- **Document Export**: PDF and Word export functionality
- **Collaborative Editing**: Real-time multi-user editing
- **Document Approval Workflow**: Advanced approval processes
- **Template Customization**: User-created custom templates
- **Document Analytics**: Usage and performance metrics
- **Integration**: Integration with external document systems

### Technical Improvements
- **Caching**: Redis caching for frequently accessed documents
- **Search**: Full-text search across document content
- **Versioning**: Git-like version control for documents
- **API Rate Limiting**: Proper rate limiting for document operations
- **Webhooks**: Real-time notifications for document changes

## Troubleshooting

### Common Issues

#### Database Connection
- Ensure DATABASE_URL is properly configured
- Check database server is running
- Verify user permissions

#### Template Loading
- Check template definitions are properly formatted
- Verify database migration has run
- Check organization permissions

#### Frontend Build
- Ensure all dependencies are installed
- Check for TypeScript errors
- Verify component imports

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=documents:*
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check the GitHub issues
4. Contact the development team

---

**Document Center Implementation Complete** ✅

The Document Center is now fully integrated into Zephix, providing a comprehensive document management solution for project teams.


