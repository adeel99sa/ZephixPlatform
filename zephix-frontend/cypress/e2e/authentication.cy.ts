describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the landing page with login option', () => {
    cy.get('[data-testid="hero-section"]').should('be.visible');
    cy.get('[data-testid="login-button"]').should('be.visible');
    cy.checkAccessibility();
  });

  it('should navigate to login page', () => {
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/login');
    cy.get('[data-testid="login-form"]').should('be.visible');
    cy.checkAccessibility();
  });

  it('should show validation errors for invalid login', () => {
    cy.visit('/login');
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="email-error"]').should('be.visible');
    cy.get('[data-testid="password-error"]').should('be.visible');
  });

  it('should successfully login with valid credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard-header"]').should('be.visible');
  });

  it('should redirect to dashboard after successful login', () => {
    cy.login('test@example.com', 'password123');
    cy.get('[data-testid="dashboard-sidebar"]').should('be.visible');
    cy.get('[data-testid="quick-actions"]').should('be.visible');
  });

  it('should protect dashboard routes when not authenticated', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });

  it('should logout successfully', () => {
    cy.login('test@example.com', 'password123');
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    cy.url().should('include', '/');
    cy.get('[data-testid="hero-section"]').should('be.visible');
  });
});
