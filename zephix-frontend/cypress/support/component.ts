// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your component test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global configuration for component tests
Cypress.on('uncaught:exception', (err) => {
  // returning false here prevents Cypress from
  // failing the test on uncaught exceptions
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Custom global commands for component testing
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to mount a component with providers
       * @example cy.mountWithProviders(<Component />)
       */
      mountWithProviders(component: React.ReactElement): Chainable<void>;
      
      /**
       * Custom command to check component accessibility
       * @example cy.checkComponentAccessibility()
       */
      checkComponentAccessibility(): Chainable<void>;
    }
  }
}
