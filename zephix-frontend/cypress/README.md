# Cypress E2E Testing

This directory contains end-to-end tests for the Zephix frontend application using Cypress.

## Structure

```
cypress/
├── e2e/                    # End-to-end test specs
│   ├── authentication.cy.ts
│   ├── dashboard.cy.ts
│   ├── projects.cy.ts
│   └── accessibility.cy.ts
├── component/              # Component test specs (future)
├── fixtures/              # Test data fixtures
├── support/               # Support files and custom commands
│   ├── e2e.ts            # E2E support configuration
│   ├── component.ts      # Component testing support
│   └── commands.ts       # Custom Cypress commands
└── README.md             # This file
```

## Test Categories

### Authentication Tests (`authentication.cy.ts`)
- Landing page display
- Login flow validation
- Protected route access
- Logout functionality
- Form validation errors

### Dashboard Tests (`dashboard.cy.ts`)
- Dashboard component visibility
- Navigation between pages
- Quick actions functionality
- Project statistics display
- Recent projects list
- Mobile responsiveness
- AI chat interface

### Projects Management Tests (`projects.cy.ts`)
- Project creation flow
- Project card display
- Filtering and search
- Edit project functionality
- Delete project with confirmation
- Empty state handling
- Loading and error states

### Accessibility Tests (`accessibility.cy.ts`)
- WCAG 2.1 AA compliance
- Focus management
- Keyboard navigation
- ARIA labels and roles
- Color contrast
- Heading structure
- Form accessibility
- Screen reader support

## Custom Commands

### `cy.login(email, password)`
Logs in a user with the provided credentials.

```typescript
cy.login('test@example.com', 'password123');
```

### `cy.createProject(name, description?)`
Creates a new project with the given name and optional description.

```typescript
cy.createProject('My Project', 'Project description');
```

### `cy.waitForLoading()`
Waits for loading states to complete.

```typescript
cy.waitForLoading();
```

### `cy.checkAccessibility()`
Runs accessibility checks using axe-core.

```typescript
cy.checkAccessibility();
```

## Running Tests

### Open Cypress Test Runner
```bash
npm run cypress:open
```

### Run Tests Headless
```bash
npm run cypress:run
```

### Run Tests with UI
```bash
npm run cypress:run:headed
```

### Run E2E Tests with Dev Server
```bash
npm run test:e2e
```

### Run E2E Tests with UI
```bash
npm run test:e2e:headed
```

## Configuration

The Cypress configuration is in `cypress.config.ts` at the project root:

- **Base URL**: `http://localhost:5173` (Vite dev server)
- **Viewport**: 1280x720
- **Timeouts**: 10 seconds for commands, requests, and responses
- **Video**: Disabled for faster runs
- **Screenshots**: Enabled on failure

## Test Data

Tests use mock data from the `mockApi` service. For consistent testing:

1. Use the provided test credentials: `test@example.com` / `password123`
2. Tests create and clean up their own data
3. Each test is independent and doesn't rely on other tests

## Best Practices

### Test Structure
- Use descriptive test names
- Group related tests in describe blocks
- Use beforeEach for common setup
- Clean up after tests when necessary

### Selectors
- Use `data-testid` attributes for reliable selection
- Avoid CSS classes that might change
- Use semantic selectors when possible

### Assertions
- Test user behavior, not implementation details
- Use meaningful assertions
- Check for both positive and negative cases

### Accessibility
- Run accessibility checks on all pages
- Test keyboard navigation
- Verify screen reader compatibility

## Debugging

### View Test Results
- Check the Cypress dashboard for detailed results
- Review screenshots and videos for failed tests
- Use `cy.debug()` for step-by-step debugging

### Common Issues
1. **Timing Issues**: Use `cy.waitForLoading()` for async operations
2. **Selector Issues**: Ensure `data-testid` attributes are present
3. **State Issues**: Reset application state between tests

## Continuous Integration

The E2E tests are configured to run in CI environments:

- Headless mode for faster execution
- Screenshot capture on failures
- Parallel test execution (when configured)

## Future Enhancements

- [ ] Component testing setup
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] API mocking strategies
- [ ] Test data factories
