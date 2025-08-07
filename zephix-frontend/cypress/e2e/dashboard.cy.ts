describe('Dashboard', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });

  it('should display dashboard with all main components', () => {
    cy.get('[data-testid="dashboard-header"]').should('be.visible');
    cy.get('[data-testid="dashboard-sidebar"]').should('be.visible');
    cy.get('[data-testid="quick-actions"]').should('be.visible');
    cy.get('[data-testid="project-stats"]').should('be.visible');
    cy.get('[data-testid="recent-projects"]').should('be.visible');
    cy.checkAccessibility();
  });

  it('should navigate to projects page', () => {
    cy.get('[data-testid="projects-link"]').click();
    cy.url().should('include', '/projects');
    cy.get('[data-testid="projects-header"]').should('be.visible');
  });

  it('should create a new project from quick actions', () => {
    cy.get('[data-testid="create-project-quick-action"]').click();
    cy.get('[data-testid="create-project-modal"]').should('be.visible');
    cy.get('[data-testid="project-name-input"]').type('Test Project');
    cy.get('[data-testid="project-description-input"]').type('Test Description');
    cy.get('[data-testid="create-project-submit"]').click();
    cy.waitForLoading();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should display project statistics', () => {
    cy.get('[data-testid="total-projects"]').should('be.visible');
    cy.get('[data-testid="active-projects"]').should('be.visible');
    cy.get('[data-testid="completed-projects"]').should('be.visible');
  });

  it('should show recent projects', () => {
    cy.get('[data-testid="recent-projects-list"]').should('be.visible');
    cy.get('[data-testid="project-card"]').should('have.length.at.least', 1);
  });

  it('should open project details when clicking on project card', () => {
    cy.get('[data-testid="project-card"]').first().click();
    cy.get('[data-testid="project-details"]').should('be.visible');
  });

  it('should toggle sidebar on mobile', () => {
    cy.viewport('iphone-6');
    cy.get('[data-testid="sidebar-toggle"]').click();
    cy.get('[data-testid="dashboard-sidebar"]').should('be.visible');
    cy.get('[data-testid="sidebar-toggle"]').click();
    cy.get('[data-testid="dashboard-sidebar"]').should('not.be.visible');
  });

  it('should handle AI chat interface', () => {
    cy.get('[data-testid="chat-interface"]').should('be.visible');
    cy.get('[data-testid="chat-input"]').type('Hello AI');
    cy.get('[data-testid="send-message-button"]').click();
    cy.get('[data-testid="chat-messages"]').should('contain', 'Hello AI');
  });
});
