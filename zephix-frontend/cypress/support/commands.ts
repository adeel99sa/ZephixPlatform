// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to login a user
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

// Custom command to create a project
Cypress.Commands.add('createProject', (name: string, description?: string) => {
  cy.get('[data-testid="create-project-button"]').click();
  cy.get('[data-testid="project-name-input"]').type(name);
  if (description) {
    cy.get('[data-testid="project-description-input"]').type(description);
  }
  cy.get('[data-testid="create-project-submit"]').click();
  cy.waitForLoading();
});

// Custom command to wait for loading states
Cypress.Commands.add('waitForLoading', () => {
  // Wait for loading spinners to disappear
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist');
  // Wait for any loading states to complete
  cy.get('[aria-busy="true"]', { timeout: 10000 }).should('not.exist');
});

// Custom command to check accessibility
Cypress.Commands.add('checkAccessibility', () => {
  cy.injectAxe();
  cy.checkA11y();
});

// Override visit command to handle authentication
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  // If we're visiting a protected route, ensure we're logged in
  if (url.includes('/dashboard') || url.includes('/projects')) {
    // Check if we're already logged in by looking for auth state
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="login-form"]').length > 0) {
        // We're on login page, need to login first
        cy.login('test@example.com', 'password123');
      }
    });
  }
  
  return originalFn(url, options);
});
