describe('Projects Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
    cy.visit('/projects');
  });

  it('should display projects page with create button', () => {
    cy.get('[data-testid="projects-header"]').should('be.visible');
    cy.get('[data-testid="create-project-button"]').should('be.visible');
    cy.checkAccessibility();
  });

  it('should create a new project', () => {
    cy.get('[data-testid="create-project-button"]').click();
    cy.get('[data-testid="create-project-modal"]').should('be.visible');
    
    cy.get('[data-testid="project-name-input"]').type('E2E Test Project');
    cy.get('[data-testid="project-description-input"]').type('This is a test project created via E2E tests');
    cy.get('[data-testid="project-priority-select"]').select('high');
    cy.get('[data-testid="project-start-date"]').type('2024-01-01');
    cy.get('[data-testid="project-end-date"]').type('2024-12-31');
    cy.get('[data-testid="project-budget"]').type('10000');
    
    cy.get('[data-testid="create-project-submit"]').click();
    cy.waitForLoading();
    
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="project-card"]').should('contain', 'E2E Test Project');
  });

  it('should display project cards with correct information', () => {
    cy.get('[data-testid="project-card"]').first().within(() => {
      cy.get('[data-testid="project-name"]').should('be.visible');
      cy.get('[data-testid="project-status"]').should('be.visible');
      cy.get('[data-testid="project-priority"]').should('be.visible');
      cy.get('[data-testid="project-dates"]').should('be.visible');
    });
  });

  it('should filter projects by status', () => {
    cy.get('[data-testid="status-filter"]').select('active');
    cy.get('[data-testid="project-card"]').each(($card) => {
      cy.wrap($card).find('[data-testid="project-status"]').should('contain', 'Active');
    });
  });

  it('should search projects by name', () => {
    cy.get('[data-testid="search-input"]').type('Test');
    cy.get('[data-testid="project-card"]').should('contain', 'Test');
  });

  it('should edit a project', () => {
    cy.get('[data-testid="project-card"]').first().find('[data-testid="edit-project-button"]').click();
    cy.get('[data-testid="edit-project-modal"]').should('be.visible');
    cy.get('[data-testid="project-name-input"]').clear().type('Updated Project Name');
    cy.get('[data-testid="update-project-submit"]').click();
    cy.waitForLoading();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should delete a project', () => {
    cy.get('[data-testid="project-card"]').first().find('[data-testid="delete-project-button"]').click();
    cy.get('[data-testid="delete-confirmation-modal"]').should('be.visible');
    cy.get('[data-testid="confirm-delete-button"]').click();
    cy.waitForLoading();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should handle empty state when no projects exist', () => {
    // This test assumes we can clear all projects or start with empty state
    cy.get('[data-testid="empty-state"]').should('be.visible');
    cy.get('[data-testid="create-first-project-button"]').should('be.visible');
  });

  it('should handle loading states', () => {
    cy.intercept('GET', '/api/projects', { delay: 1000 }).as('getProjects');
    cy.visit('/projects');
    cy.get('[data-testid="loading-skeleton"]').should('be.visible');
    cy.wait('@getProjects');
    cy.get('[data-testid="project-card"]').should('be.visible');
  });

  it('should handle error states', () => {
    cy.intercept('GET', '/api/projects', { statusCode: 500 }).as('getProjectsError');
    cy.visit('/projects');
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });
});
