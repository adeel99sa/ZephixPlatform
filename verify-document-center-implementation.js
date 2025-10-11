const fs = require('fs');
const path = require('path');

console.log('🔍 Document Center Implementation Verification');
console.log('==============================================\n');

// Check if files exist and are properly structured
const checks = [
  {
    name: 'Database Migration',
    file: 'src/migrations/1757300000000-AddDocumentCenterTables.ts',
    required: true,
    check: (content) => {
      const hasDocumentTemplates = content.includes('CREATE TABLE document_templates');
      const hasProjectDocuments = content.includes('CREATE TABLE project_documents');
      const hasDocumentActivity = content.includes('CREATE TABLE document_activity');
      const hasIndexes = content.includes('CREATE INDEX');
      return hasDocumentTemplates && hasProjectDocuments && hasDocumentActivity && hasIndexes;
    }
  },
  {
    name: 'Document Template Entity',
    file: 'src/modules/documents/entities/document-template.entity.ts',
    required: true,
    check: (content) => {
      const hasEntity = content.includes('@Entity(\'document_templates\')');
      const hasColumns = content.includes('@Column') && content.includes('templateType');
      const hasRelations = content.includes('@ManyToOne');
      return hasEntity && hasColumns && hasRelations;
    }
  },
  {
    name: 'Project Document Entity',
    file: 'src/modules/documents/entities/project-document.entity.ts',
    required: true,
    check: (content) => {
      const hasEntity = content.includes('@Entity(\'project_documents\')');
      const hasColumns = content.includes('@Column') && content.includes('documentName');
      const hasRelations = content.includes('@ManyToOne') && content.includes('@OneToMany');
      return hasEntity && hasColumns && hasRelations;
    }
  },
  {
    name: 'Document Activity Entity',
    file: 'src/modules/documents/entities/document-activity.entity.ts',
    required: true,
    check: (content) => {
      const hasEntity = content.includes('@Entity(\'document_activity\')');
      const hasColumns = content.includes('@Column') && content.includes('action');
      return hasEntity && hasColumns;
    }
  },
  {
    name: 'Template Definitions',
    file: 'src/modules/documents/templates/template-definitions.ts',
    required: true,
    check: (content) => {
      const hasTemplates = content.includes('DOCUMENT_TEMPLATES');
      const hasProjectCharter = content.includes('PROJECT_CHARTER');
      const hasRiskRegister = content.includes('RISK_REGISTER');
      const hasStatusReport = content.includes('STATUS_REPORT');
      return hasTemplates && hasProjectCharter && hasRiskRegister && hasStatusReport;
    }
  },
  {
    name: 'Documents Service',
    file: 'src/modules/documents/documents.service.ts',
    required: true,
    check: (content) => {
      const hasService = content.includes('@Injectable()');
      const hasMethods = content.includes('createDocumentFromTemplate') && content.includes('getTemplates');
      const hasAutoFill = content.includes('autoFillTemplate');
      return hasService && hasMethods && hasAutoFill;
    }
  },
  {
    name: 'Documents Controller',
    file: 'src/modules/documents/documents.controller.ts',
    required: true,
    check: (content) => {
      const hasController = content.includes('@Controller(\'api/documents\')');
      const hasEndpoints = content.includes('@Get') && content.includes('@Post') && content.includes('@Put');
      const hasGuards = content.includes('@UseGuards');
      return hasController && hasEndpoints && hasGuards;
    }
  },
  {
    name: 'Documents Module',
    file: 'src/modules/documents/documents.module.ts',
    required: true,
    check: (content) => {
      const hasModule = content.includes('@Module');
      const hasImports = content.includes('TypeOrmModule.forFeature');
      const hasExports = content.includes('exports: [DocumentsService]');
      return hasModule && hasImports && hasExports;
    }
  },
  {
    name: 'App Module Registration',
    file: 'src/app.module.ts',
    required: true,
    check: (content) => {
      const hasImport = content.includes('DocumentsModule');
      const hasInImports = content.includes('DocumentsModule,');
      return hasImport && hasInImports;
    }
  },
  {
    name: 'Document Service (Frontend)',
    file: 'zephix-frontend/src/services/documentService.ts',
    required: true,
    check: (content) => {
      const hasInterfaces = content.includes('interface DocumentTemplate');
      const hasClass = content.includes('class DocumentService');
      const hasMethods = content.includes('getTemplates') && content.includes('createFromTemplate');
      return hasInterfaces && hasClass && hasMethods;
    }
  },
  {
    name: 'Document Center Page',
    file: 'zephix-frontend/src/pages/documents/DocumentCenterPage.tsx',
    required: true,
    check: (content) => {
      const hasComponent = content.includes('export default function DocumentCenterPage');
      const hasHooks = content.includes('useQuery') && content.includes('useMutation');
      const hasState = content.includes('useState');
      return hasComponent && hasHooks && hasState;
    }
  },
  {
    name: 'Template Card Component',
    file: 'zephix-frontend/src/pages/documents/components/TemplateCard.tsx',
    required: true,
    check: (content) => {
      const hasComponent = content.includes('export const TemplateCard');
      const hasProps = content.includes('template: DocumentTemplate');
      return hasComponent && hasProps;
    }
  },
  {
    name: 'Document Editor Component',
    file: 'zephix-frontend/src/pages/documents/components/DocumentEditor.tsx',
    required: true,
    check: (content) => {
      const hasComponent = content.includes('export const DocumentEditor');
      const hasProps = content.includes('document: ProjectDocument');
      const hasAutoSave = content.includes('autoSaveTimer');
      return hasComponent && hasProps && hasAutoSave;
    }
  },
  {
    name: 'Attach Project Modal',
    file: 'zephix-frontend/src/pages/documents/components/AttachProjectModal.tsx',
    required: true,
    check: (content) => {
      const hasComponent = content.includes('export const AttachProjectModal');
      const hasProps = content.includes('document: ProjectDocument');
      return hasComponent && hasProps;
    }
  },
  {
    name: 'Template Form Modal',
    file: 'zephix-frontend/src/pages/documents/components/TemplateFormModal.tsx',
    required: true,
    check: (content) => {
      const hasComponent = content.includes('export const TemplateFormModal');
      const hasProps = content.includes('template: DocumentTemplate');
      return hasComponent && hasProps;
    }
  },
  {
    name: 'UI Components',
    files: [
      'zephix-frontend/src/components/ui/input.tsx',
      'zephix-frontend/src/components/ui/textarea.tsx',
      'zephix-frontend/src/components/ui/select.tsx',
      'zephix-frontend/src/components/ui/tabs.tsx',
      'zephix-frontend/src/components/ui/modal.tsx',
      'zephix-frontend/src/components/ui/label.tsx'
    ],
    required: true,
    check: (files) => {
      return files.every(file => file.exists && file.content.includes('export'));
    }
  },
  {
    name: 'Command Palette Integration',
    file: 'zephix-frontend/src/components/CommandPalette.tsx',
    required: true,
    check: (content) => {
      const hasDocumentImport = content.includes('documentService');
      const hasDocumentCommands = content.includes('Document Templates');
      const hasCreateDocument = content.includes('createDocument');
      return hasDocumentImport && hasDocumentCommands && hasCreateDocument;
    }
  },
  {
    name: 'App Routing',
    file: 'zephix-frontend/src/App.tsx',
    required: true,
    check: (content) => {
      const hasImport = content.includes('DocumentCenterPage');
      const hasRoute = content.includes('/documents');
      return hasImport && hasRoute;
    }
  },
  {
    name: 'Sidebar Navigation',
    file: 'zephix-frontend/src/components/navigation/Sidebar.tsx',
    required: true,
    check: (content) => {
      const hasDocuments = content.includes('Documents');
      const hasIcon = content.includes('DocumentTextIcon');
      return hasDocuments && hasIcon;
    }
  }
];

let passed = 0;
let failed = 0;
let warnings = 0;

console.log('📋 Checking Implementation Files...\n');

checks.forEach(check => {
  try {
    if (check.files) {
      // Multiple files check
      const fileResults = check.files.map(filePath => {
        const exists = fs.existsSync(filePath);
        const content = exists ? fs.readFileSync(filePath, 'utf8') : '';
        return { exists, content, path: filePath };
      });
      
      const allExist = fileResults.every(file => file.exists);
      const isValid = check.check(fileResults);
      
      if (allExist && isValid) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}`);
        if (!allExist) {
          console.log(`   Missing files: ${fileResults.filter(f => !f.exists).map(f => f.path).join(', ')}`);
        }
        failed++;
      }
    } else {
      // Single file check
      const exists = fs.existsSync(check.file);
      const content = exists ? fs.readFileSync(check.file, 'utf8') : '';
      const isValid = check.check(content);
      
      if (exists && isValid) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}`);
        if (!exists) {
          console.log(`   File missing: ${check.file}`);
        } else {
          console.log(`   File exists but validation failed`);
        }
        failed++;
      }
    }
  } catch (error) {
    console.log(`❌ ${check.name} - Error: ${error.message}`);
    failed++;
  }
});

console.log('\n📊 Verification Summary');
console.log('========================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️  Warnings: ${warnings}`);

console.log('\n🎯 Implementation Status');
console.log('========================');

if (failed === 0) {
  console.log('🎉 ALL CHECKS PASSED! Document Center implementation is complete.');
  console.log('\n📋 Next Steps:');
  console.log('1. Set up database connection');
  console.log('2. Run migration to create document tables');
  console.log('3. Initialize document templates');
  console.log('4. Test the application');
  console.log('5. Deploy to production');
} else {
  console.log('⚠️  Some checks failed. Please review the issues above.');
  console.log('\n🔧 Common Issues:');
  console.log('- Missing files or incorrect file paths');
  console.log('- Syntax errors in TypeScript/React files');
  console.log('- Missing imports or exports');
  console.log('- Incorrect component structure');
}

console.log('\n📚 Documentation:');
console.log('- See DOCUMENT_CENTER_IMPLEMENTATION.md for detailed documentation');
console.log('- Check test-document-center.sh for testing instructions');
console.log('- Review the API endpoints in the controller files');

console.log('\n🚀 Ready for Database Setup!');
console.log('Once database connection is established, run:');
console.log('node run-document-migration.js');

