describe('PM Dashboard Comprehensive Test Suite', () => {
  let testProjectId: string;
  let testBRDId: string;
  
  before(() => {
    // Reset test data and setup
    cy.exec('npm run test:reset-db'); // Assumes test data reset script exists
  });

  beforeEach(() => {
    // Login with test user
    cy.login('pm-test@zephix.com', 'Test123!@#');
    cy.waitForLoading();
  });

  describe('1. Project Creation Workflow', () => {
    it('should validate complete project creation flow', () => {
      cy.visit('/pm/project-initiation');
      
      // Test project creation button visibility
      cy.get('[data-testid="create-new-project-btn"]').should('be.visible');
      cy.get('[data-testid="create-new-project-btn"]').click();
      
      // Validate modal opens
      cy.get('[data-testid="create-project-modal"]').should('be.visible');
      
      // Fill project details
      cy.get('[data-testid="project-name-input"]').type('Enterprise Test Project');
      cy.get('[data-testid="project-description-input"]').type('Comprehensive testing of PM dashboard features');
      cy.get('[data-testid="project-type-select"]').select('enterprise');
      cy.get('[data-testid="project-priority-select"]').select('high');
      cy.get('[data-testid="project-start-date"]').type('2024-01-01');
      cy.get('[data-testid="project-end-date"]').type('2024-12-31');
      cy.get('[data-testid="project-budget-input"]').type('500000');
      cy.get('[data-testid="project-department-select"]').select('IT');
      
      // Add team members
      cy.get('[data-testid="add-team-member-btn"]').click();
      cy.get('[data-testid="team-member-email-0"]').type('developer@zephix.com');
      cy.get('[data-testid="team-member-role-0"]').select('developer');
      
      // Mock API response
      cy.intercept('POST', '/api/pm/projects', {
        statusCode: 201,
        body: { id: 'test-project-id', name: 'Enterprise Test Project' }
      }).as('createProject');
      
      cy.get('[data-testid="create-project-submit-btn"]').click();
      cy.wait('@createProject').then((interception) => {
        testProjectId = interception.response.body.id;
      });
      
      // Verify success message
      cy.get('[data-testid="success-toast"]').should('contain', 'Project created successfully');
      
      // Verify redirect to project dashboard
      cy.url().should('include', '/pm/project/');
      
      // Verify project appears in list
      cy.visit('/projects');
      cy.get('[data-testid="project-card"]').should('contain', 'Enterprise Test Project');
    });

    it('should handle project creation errors gracefully', () => {
      cy.visit('/pm/project-initiation');
      cy.get('[data-testid="create-new-project-btn"]').click();
      
      // Test validation errors
      cy.get('[data-testid="create-project-submit-btn"]').click();
      cy.get('[data-testid="project-name-error"]').should('contain', 'Project name is required');
      
      // Test server error handling
      cy.get('[data-testid="project-name-input"]').type('Error Test Project');
      cy.intercept('POST', '/api/pm/projects', {
        statusCode: 400,
        body: { message: 'Failed to create project' }
      }).as('createProjectError');
      
      cy.get('[data-testid="create-project-submit-btn"]').click();
      cy.wait('@createProjectError');
      cy.get('[data-testid="error-toast"]').should('contain', 'Failed to create project');
    });
  });

  describe('2. BRD Upload and AI Processing', () => {
    beforeEach(() => {
      cy.visit('/brd/upload');
    });

    it('should successfully upload and process a BRD document', () => {
      // Create test BRD file
      const fileName = 'test-brd.pdf';
      const fileContent = 'Test BRD content for AI processing';
      
      cy.fixture('test-brd.pdf', 'base64').then(fileContent => {
        const blob = Cypress.Blob.base64StringToBlob(fileContent, 'application/pdf');
        const file = new File([blob], fileName, { type: 'application/pdf' });
        
        // Upload file via drag and drop
        cy.get('[data-testid="brd-upload-dropzone"]').trigger('drop', {
          dataTransfer: { files: [file] }
        });
      });
      
      // Verify file appears in upload queue
      cy.get('[data-testid="uploaded-file-item"]').should('contain', fileName);
      cy.get('[data-testid="file-upload-progress"]').should('be.visible');
      
      // Mock BRD analysis API
      cy.intercept('POST', '/api/pm/brds/*/analyze', {
        statusCode: 200,
        body: {
          id: 'brd-123',
          status: 'completed',
          analysis: {
            projectName: 'Extracted Project Name',
            objectives: ['Objective 1', 'Objective 2'],
            requirements: ['Req 1', 'Req 2'],
            timeline: '6 months',
            budget: '$250,000',
            risks: ['Risk 1', 'Risk 2'],
            stakeholders: ['PM', 'Dev Team', 'Business Owner']
          }
        }
      }).as('analyzeBRD');
      
      // Start processing
      cy.get('[data-testid="process-brd-btn"]').click();
      cy.wait('@analyzeBRD').then((interception) => {
        testBRDId = interception.response.body.id;
      });
      
      // Verify processing status
      cy.get('[data-testid="processing-status"]').should('contain', 'AI Analysis Complete');
      
      // Verify extracted information display
      cy.get('[data-testid="brd-analysis-results"]').should('be.visible');
      cy.get('[data-testid="extracted-project-name"]').should('contain', 'Extracted Project Name');
      cy.get('[data-testid="extracted-objectives"]').should('contain', 'Objective 1');
      cy.get('[data-testid="extracted-requirements"]').should('contain', 'Req 1');
      
      // Test conversion to project
      cy.get('[data-testid="convert-to-project-btn"]').click();
      cy.get('[data-testid="project-conversion-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-conversion-btn"]').click();
      cy.get('[data-testid="success-toast"]').should('contain', 'Project created from BRD');
    });

    it('should handle invalid file types', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      cy.get('[data-testid="brd-upload-dropzone"]').trigger('drop', {
        dataTransfer: { files: [invalidFile] }
      });
      
      cy.get('[data-testid="error-message"]').should('contain', 'Only PDF and DOCX files are supported');
    });

    it('should handle large file uploads', () => {
      // Create a large file (>50MB)
      const largeContent = new Array(52 * 1024 * 1024).join('a');
      const largeFile = new File([largeContent], 'large-file.pdf', { type: 'application/pdf' });
      
      cy.get('[data-testid="brd-upload-dropzone"]').trigger('drop', {
        dataTransfer: { files: [largeFile] }
      });
      
      cy.get('[data-testid="error-message"]').should('contain', 'File size must be less than 50MB');
    });
  });

  describe('3. Dashboard Navigation and Views', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
    });

    it('should navigate through all dashboard sections', () => {
      // Main dashboard
      cy.get('[data-testid="dashboard-header"]').should('be.visible');
      cy.get('[data-testid="project-stats-widget"]').should('be.visible');
      cy.get('[data-testid="recent-activity-widget"]').should('be.visible');
      
      // Navigate to PM Dashboard
      cy.get('[data-testid="nav-pm-dashboard"]').click();
      cy.url().should('include', '/pm/dashboard');
      cy.get('[data-testid="pm-dashboard-content"]').should('be.visible');
      
      // Navigate to Projects view
      cy.get('[data-testid="nav-projects"]').click();
      cy.url().should('include', '/projects');
      cy.get('[data-testid="projects-grid"]').should('be.visible');
      
      // Navigate to Status Reports
      cy.get('[data-testid="nav-status-reports"]').click();
      cy.url().should('include', '/pm/status-reporting');
      cy.get('[data-testid="status-reports-dashboard"]').should('be.visible');
      
      // Navigate to Risk Management
      cy.get('[data-testid="nav-risk-management"]').click();
      cy.url().should('include', '/pm/risk-management');
      cy.get('[data-testid="risk-dashboard"]').should('be.visible');
      
      // Navigate to Document Intelligence
      cy.get('[data-testid="nav-document-intelligence"]').click();
      cy.url().should('include', '/intelligence/documents');
      cy.get('[data-testid="document-intelligence-dashboard"]').should('be.visible');
    });

    it('should display correct project metrics', () => {
      cy.visit('/pm/dashboard');
      
      // Verify metrics display
      cy.get('[data-testid="total-projects-metric"]').should('be.visible');
      cy.get('[data-testid="active-projects-metric"]').should('be.visible');
      cy.get('[data-testid="completed-projects-metric"]').should('be.visible');
      cy.get('[data-testid="at-risk-projects-metric"]').should('be.visible');
      
      // Verify charts
      cy.get('[data-testid="project-timeline-chart"]').should('be.visible');
      cy.get('[data-testid="budget-utilization-chart"]').should('be.visible');
      cy.get('[data-testid="team-workload-chart"]').should('be.visible');
    });

    it('should handle responsive design', () => {
      // Desktop view
      cy.viewport(1920, 1080);
      cy.get('[data-testid="sidebar-navigation"]').should('be.visible');
      
      // Tablet view
      cy.viewport(768, 1024);
      cy.get('[data-testid="sidebar-navigation"]').should('not.be.visible');
      cy.get('[data-testid="mobile-menu-toggle"]').should('be.visible');
      
      // Mobile view
      cy.viewport(375, 667);
      cy.get('[data-testid="mobile-menu-toggle"]').click();
      cy.get('[data-testid="mobile-navigation"]').should('be.visible');
    });
  });

  describe('4. Data Export Capabilities', () => {
    beforeEach(() => {
      cy.visit(`/pm/project/${testProjectId}/status`);
    });

    it('should export project data in multiple formats', () => {
      // Test PDF export
      cy.get('[data-testid="export-menu-btn"]').click();
      cy.get('[data-testid="export-pdf-option"]').click();
      
      cy.intercept('GET', `/api/pm/projects/${testProjectId}/export/pdf`, {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="project-report.pdf"'
        },
        body: 'mock-pdf-content'
      }).as('exportPdf');
      
      cy.wait('@exportPdf');
      cy.get('[data-testid="success-toast"]').should('contain', 'PDF exported successfully');
      
      // Test Excel export
      cy.get('[data-testid="export-menu-btn"]').click();
      cy.get('[data-testid="export-excel-option"]').click();
      
      cy.intercept('GET', `/api/pm/projects/${testProjectId}/export/excel`, {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="project-report.xlsx"'
        },
        body: 'mock-excel-content'
      }).as('exportExcel');
      
      cy.wait('@exportExcel');
      cy.get('[data-testid="success-toast"]').should('contain', 'Excel exported successfully');
      
      // Test CSV export
      cy.get('[data-testid="export-menu-btn"]').click();
      cy.get('[data-testid="export-csv-option"]').click();
      
      cy.intercept('GET', `/api/pm/projects/${testProjectId}/export/csv`, {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="project-report.csv"'
        },
        body: 'mock-csv-content'
      }).as('exportCsv');
      
      cy.wait('@exportCsv');
      cy.get('[data-testid="success-toast"]').should('contain', 'CSV exported successfully');
    });

    it('should handle bulk export operations', () => {
      cy.visit('/projects');
      
      // Select multiple projects
      cy.get('[data-testid="project-checkbox-1"]').check();
      cy.get('[data-testid="project-checkbox-2"]').check();
      cy.get('[data-testid="project-checkbox-3"]').check();
      
      // Bulk export
      cy.get('[data-testid="bulk-actions-menu"]').click();
      cy.get('[data-testid="bulk-export-option"]').click();
      cy.get('[data-testid="bulk-export-modal"]').should('be.visible');
      
      // Select export options
      cy.get('[data-testid="include-status-reports"]').check();
      cy.get('[data-testid="include-risk-assessments"]').check();
      cy.get('[data-testid="include-timelines"]').check();
      
      cy.get('[data-testid="confirm-bulk-export-btn"]').click();
      cy.get('[data-testid="export-progress-modal"]').should('be.visible');
      cy.get('[data-testid="export-progress-bar"]').should('be.visible');
    });

    it('should schedule automated exports', () => {
      cy.visit('/settings/exports');
      
      cy.get('[data-testid="create-export-schedule-btn"]').click();
      cy.get('[data-testid="export-schedule-modal"]').should('be.visible');
      
      // Configure schedule
      cy.get('[data-testid="schedule-name-input"]').type('Weekly PM Report');
      cy.get('[data-testid="schedule-frequency-select"]').select('weekly');
      cy.get('[data-testid="schedule-day-select"]').select('monday');
      cy.get('[data-testid="schedule-time-input"]').type('09:00');
      cy.get('[data-testid="schedule-format-select"]').select('pdf');
      cy.get('[data-testid="schedule-recipients-input"]').type('pm@company.com, executive@company.com');
      
      cy.get('[data-testid="save-schedule-btn"]').click();
      cy.get('[data-testid="success-toast"]').should('contain', 'Export schedule created');
    });
  });

  describe('5. Integration Connection Status', () => {
    beforeEach(() => {
      cy.visit('/settings/integrations');
    });

    it('should display all integration statuses', () => {
      // Check integration cards
      cy.get('[data-testid="integration-jira"]').should('be.visible');
      cy.get('[data-testid="integration-slack"]').should('be.visible');
      cy.get('[data-testid="integration-teams"]').should('be.visible');
      cy.get('[data-testid="integration-github"]').should('be.visible');
      cy.get('[data-testid="integration-gitlab"]').should('be.visible');
      cy.get('[data-testid="integration-azure-devops"]').should('be.visible');
      
      // Check connection statuses
      cy.get('[data-testid="integration-jira"]').within(() => {
        cy.get('[data-testid="connection-status"]').should('have.class', 'connected');
        cy.get('[data-testid="last-sync-time"]').should('be.visible');
      });
    });

    it('should test integration connections', () => {
      // Test Jira connection
      cy.get('[data-testid="integration-jira"]').within(() => {
        cy.get('[data-testid="test-connection-btn"]').click();
      });
      
      cy.intercept('POST', '/api/integrations/jira/test', {
        statusCode: 200,
        body: { success: true, message: 'Connection successful' }
      }).as('testJiraConnection');
      
      cy.wait('@testJiraConnection');
      cy.get('[data-testid="success-toast"]').should('contain', 'Jira connection successful');
      
      // Test failed connection
      cy.get('[data-testid="integration-slack"]').within(() => {
        cy.get('[data-testid="test-connection-btn"]').click();
      });
      
      cy.intercept('POST', '/api/integrations/slack/test', {
        statusCode: 400,
        body: { message: 'Connection failed: Invalid token' }
      }).as('testSlackConnection');
      
      cy.wait('@testSlackConnection');
      cy.get('[data-testid="error-toast"]').should('contain', 'Slack connection failed');
    });

    it('should configure new integrations', () => {
      cy.get('[data-testid="integration-github"]').within(() => {
        cy.get('[data-testid="configure-btn"]').click();
      });
      
      cy.get('[data-testid="integration-config-modal"]').should('be.visible');
      
      // Fill configuration
      cy.get('[data-testid="github-token-input"]').type('ghp_testtoken123456');
      cy.get('[data-testid="github-org-input"]').type('test-organization');
      cy.get('[data-testid="github-repo-input"]').type('test-repo');
      
      // Enable webhooks
      cy.get('[data-testid="enable-webhooks-checkbox"]').check();
      cy.get('[data-testid="webhook-events-select"]').select(['push', 'pull_request', 'issues']);
      
      cy.get('[data-testid="save-integration-btn"]').click();
      cy.get('[data-testid="success-toast"]').should('contain', 'GitHub integration configured');
    });

    it('should monitor integration health', () => {
      cy.visit('/dashboard/integrations-health');
      
      // Check health metrics
      cy.get('[data-testid="integration-health-summary"]').should('be.visible');
      cy.get('[data-testid="total-integrations-count"]').should('contain', '6');
      cy.get('[data-testid="active-integrations-count"]').should('contain', '4');
      cy.get('[data-testid="failed-integrations-count"]').should('contain', '0');
      
      // Check sync history
      cy.get('[data-testid="sync-history-table"]').should('be.visible');
      cy.get('[data-testid="sync-history-row"]').should('have.length.greaterThan', 0);
      
      // Check error logs
      cy.get('[data-testid="integration-errors-tab"]').click();
      cy.get('[data-testid="error-logs-table"]').should('be.visible');
    });
  });

  describe('Enterprise Readiness Validation', () => {
    it('should validate security features', () => {
      // Test session timeout
      cy.window().then((win) => {
        // Simulate 30 minutes of inactivity
        cy.clock();
        cy.tick(30 * 60 * 1000);
      });
      
      cy.get('[data-testid="session-timeout-modal"]').should('be.visible');
      cy.get('[data-testid="extend-session-btn"]').click();
      
      // Test data encryption indicators
      cy.visit('/settings/security');
      cy.get('[data-testid="encryption-status"]').should('contain', 'AES-256');
      cy.get('[data-testid="ssl-status"]').should('contain', 'Active');
    });

    it('should validate performance metrics', () => {
      cy.visit('/dashboard');
      
      // Check page load time
      cy.window().then((win) => {
        const loadTime = win.performance.timing.loadEventEnd - win.performance.timing.navigationStart;
        expect(loadTime).to.be.lessThan(3000); // Less than 3 seconds
      });
      
      // Check API response times
      cy.intercept('GET', '/api/projects', (req) => {
        req.on('response', (res) => {
          expect(res.duration).to.be.lessThan(500); // Less than 500ms
        });
      });
    });

    it('should validate scalability features', () => {
      // Test pagination
      cy.visit('/projects');
      cy.get('[data-testid="pagination-controls"]').should('be.visible');
      cy.get('[data-testid="items-per-page-select"]').select('50');
      cy.get('[data-testid="project-card"]').should('have.length.lessThan', 51);
      
      // Test lazy loading
      cy.scrollTo('bottom');
      cy.get('[data-testid="loading-more-indicator"]').should('be.visible');
    });

    it('should validate audit logging', () => {
      cy.visit('/settings/audit-logs');
      
      cy.get('[data-testid="audit-log-table"]').should('be.visible');
      cy.get('[data-testid="audit-log-entry"]').first().within(() => {
        cy.get('[data-testid="audit-timestamp"]').should('be.visible');
        cy.get('[data-testid="audit-user"]').should('be.visible');
        cy.get('[data-testid="audit-action"]').should('be.visible');
        cy.get('[data-testid="audit-resource"]').should('be.visible');
      });
      
      // Test audit log filtering
      cy.get('[data-testid="audit-filter-user"]').type('pm-test@zephix.com');
      cy.get('[data-testid="audit-filter-action"]').select('project_created');
      cy.get('[data-testid="apply-filters-btn"]').click();
    });
  });

  after(() => {
    // Generate test report
    cy.task('generateTestReport', {
      suiteName: 'PM Dashboard Comprehensive Tests',
      timestamp: new Date().toISOString()
    });
  });
});