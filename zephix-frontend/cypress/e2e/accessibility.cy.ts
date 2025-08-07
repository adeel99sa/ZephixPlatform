describe('Accessibility', () => {
  it('should meet WCAG 2.1 AA standards on landing page', () => {
    cy.visit('/');
    cy.checkAccessibility();
  });

  it('should meet accessibility standards on login page', () => {
    cy.visit('/login');
    cy.checkAccessibility();
  });

  it('should meet accessibility standards on dashboard', () => {
    cy.login('test@example.com', 'password123');
    cy.checkAccessibility();
  });

  it('should meet accessibility standards on projects page', () => {
    cy.login('test@example.com', 'password123');
    cy.visit('/projects');
    cy.checkAccessibility();
  });

  it('should have proper focus management in modals', () => {
    cy.login('test@example.com', 'password123');
    cy.visit('/projects');
    cy.get('[data-testid="create-project-button"]').click();
    cy.get('[data-testid="create-project-modal"]').should('be.visible');
    cy.focused().should('have.attr', 'data-testid', 'project-name-input');
    cy.checkAccessibility();
  });

  it('should have proper keyboard navigation', () => {
    cy.visit('/');
    cy.get('body').tab();
    cy.focused().should('be.visible');
    cy.get('body').tab();
    cy.focused().should('be.visible');
  });

  it('should have proper ARIA labels', () => {
    cy.visit('/');
    cy.get('[aria-label]').should('exist');
    cy.get('[aria-labelledby]').should('exist');
    cy.get('[aria-describedby]').should('exist');
  });

  it('should have proper color contrast', () => {
    cy.visit('/');
    cy.checkAccessibility({
      rules: {
        'color-contrast': { enabled: true }
      }
    });
  });

  it('should have proper heading structure', () => {
    cy.visit('/');
    cy.get('h1').should('exist');
    cy.get('h1').should('have.length', 1);
    cy.checkAccessibility({
      rules: {
        'heading-order': { enabled: true }
      }
    });
  });

  it('should have proper form labels', () => {
    cy.visit('/login');
    cy.get('input').each(($input) => {
      const id = $input.attr('id');
      if (id) {
        cy.get(`label[for="${id}"]`).should('exist');
      }
    });
  });

  it('should have proper alt text for images', () => {
    cy.visit('/');
    cy.get('img').each(($img) => {
      cy.wrap($img).should('have.attr', 'alt');
    });
  });

  it('should have proper skip links', () => {
    cy.visit('/');
    cy.get('[data-testid="skip-to-main"]').should('exist');
    cy.get('[data-testid="skip-to-main"]').focus();
    cy.get('[data-testid="skip-to-main"]').should('be.visible');
  });

  it('should have proper error announcements', () => {
    cy.visit('/login');
    cy.get('[data-testid="login-button"]').click();
    cy.get('[role="alert"]').should('exist');
    cy.get('[role="alert"]').should('contain', 'error');
  });

  it('should have proper loading announcements', () => {
    cy.login('test@example.com', 'password123');
    cy.get('[aria-live="polite"]').should('exist');
    cy.get('[aria-busy="true"]').should('exist');
  });
});
