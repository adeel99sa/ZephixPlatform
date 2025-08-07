# Sentry Integration

This document describes the Sentry integration for error tracking and performance monitoring in the Zephix frontend application.

## Overview

Sentry provides real-time error tracking and performance monitoring to help identify and resolve issues quickly. The integration includes:

- Error tracking with context
- Performance monitoring
- User session tracking
- Custom breadcrumbs
- Error boundaries with fallback UI

## Configuration

### Environment Variables

Create a `.env` file in the frontend root with the following variables:

```env
# Sentry Configuration
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_RELEASE=1.0.0

# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true

# Application Configuration
VITE_APP_NAME=Zephix AI
VITE_APP_VERSION=1.0.0
```

### Sentry DSN

To get your Sentry DSN:

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new project for your React application
3. Copy the DSN from the project settings
4. Add it to your `.env` file

## Features

### Error Tracking

The application automatically captures JavaScript errors with full context:

- Error stack traces
- User information
- Browser and device details
- Component stack traces
- Custom tags and context

### Performance Monitoring

Track performance metrics for:

- Page load times
- API call durations
- User interactions
- Component render times

### User Session Tracking

Automatically track user sessions with:

- User ID and email
- Authentication status
- Session duration
- User actions as breadcrumbs

### Error Boundaries

React error boundaries with Sentry integration:

- Graceful error handling
- User-friendly error UI
- Error reporting dialog
- Development error details

## Usage

### Basic Error Tracking

```typescript
import { captureSentryError } from '../config/sentry';

try {
  // Your code here
} catch (error) {
  captureSentryError(error, {
    action: 'user_action',
    component: 'MyComponent',
  });
}
```

### Performance Monitoring

```typescript
import { useSentryPerformance } from '../hooks/useSentryPerformance';

const MyComponent = () => {
  const { finish, setTag } = useSentryPerformance({
    name: 'Component Load',
    operation: 'ui.render',
    data: { component: 'MyComponent' },
  });

  useEffect(() => {
    // Component logic
    finish();
  }, []);

  return <div>My Component</div>;
};
```

### API Performance Tracking

```typescript
import { useSentryApiPerformance } from '../hooks/useSentryPerformance';

const useApiCall = () => {
  const { finish, setData } = useSentryApiPerformance('/api/projects');

  const fetchProjects = async () => {
    try {
      const response = await api.getProjects();
      setData('response_size', response.data.length);
      finish();
      return response;
    } catch (error) {
      finish();
      throw error;
    }
  };

  return { fetchProjects };
};
```

### User Interaction Tracking

```typescript
import { useSentryInteractionPerformance } from '../hooks/useSentryPerformance';

const MyButton = () => {
  const { finish } = useSentryInteractionPerformance('button_click');

  const handleClick = () => {
    // Button logic
    finish();
  };

  return <button onClick={handleClick}>Click Me</button>;
};
```

### Custom Breadcrumbs

```typescript
import { addSentryBreadcrumb } from '../config/sentry';

// Add breadcrumb for user action
addSentryBreadcrumb('User created project', 'user', {
  projectName: 'My Project',
  userId: 'user123',
});
```

### Setting User Context

```typescript
import { setSentryUser, clearSentryUser } from '../config/sentry';

// Set user context after login
setSentryUser({
  id: 'user123',
  email: 'user@example.com',
  name: 'John Doe',
});

// Clear user context after logout
clearSentryUser();
```

## Error Boundaries

### Using Sentry Error Boundary

```typescript
import { SentryErrorBoundary } from '../components/ErrorBoundary';

const App = () => {
  return (
    <SentryErrorBoundary>
      <YourApp />
    </SentryErrorBoundary>
  );
};
```

### Custom Error Boundary

```typescript
import { ErrorBoundary } from '../components/ErrorBoundary';

const CustomErrorFallback = () => (
  <div className="error-fallback">
    <h1>Something went wrong</h1>
    <p>Please try refreshing the page</p>
  </div>
);

const App = () => {
  return (
    <ErrorBoundary fallback={<CustomErrorFallback />}>
      <YourApp />
    </ErrorBoundary>
  );
};
```

## Best Practices

### Error Handling

1. **Use try-catch blocks** for async operations
2. **Capture errors with context** for better debugging
3. **Set appropriate error levels** (error, warning, info)
4. **Add custom tags** for filtering and grouping

### Performance Monitoring

1. **Monitor critical user paths** (login, project creation)
2. **Track API call performance** for optimization
3. **Set performance budgets** for key metrics
4. **Use custom transactions** for complex operations

### User Experience

1. **Show user-friendly error messages**
2. **Provide recovery options** (retry, go back)
3. **Include error reporting** for user feedback
4. **Maintain app functionality** during errors

### Privacy and Security

1. **Filter sensitive data** before sending to Sentry
2. **Respect user privacy** settings
3. **Comply with data protection** regulations
4. **Use environment-specific** configurations

## Monitoring and Alerts

### Setting Up Alerts

1. **Error rate alerts** for critical issues
2. **Performance degradation** alerts
3. **User experience** impact alerts
4. **Custom metric** alerts

### Dashboard Configuration

1. **Error trends** dashboard
2. **Performance metrics** dashboard
3. **User session** analytics
4. **Release health** monitoring

## Development vs Production

### Development Environment

- **Full error details** in console
- **Debug mode** enabled
- **100% sampling** for errors and performance
- **Local error reporting** disabled

### Production Environment

- **Filtered error reporting** to avoid noise
- **Sampled performance** monitoring (10%)
- **User-friendly** error messages
- **Optimized** for performance

## Troubleshooting

### Common Issues

1. **DSN not configured** - Check environment variables
2. **Errors not appearing** - Verify Sentry project settings
3. **Performance data missing** - Check sampling configuration
4. **User context not set** - Verify authentication flow

### Debug Mode

Enable debug mode in development:

```typescript
// In sentry.ts configuration
debug: environment === 'development',
```

### Testing Sentry Integration

```typescript
// Test error capture
import { captureSentryError } from '../config/sentry';

const testError = new Error('Test error');
captureSentryError(testError, { test: true });
```

## Integration with Other Tools

### GitHub Integration

- **Issue linking** with Sentry events
- **Release tracking** with GitHub releases
- **Commit tracking** for error resolution

### Slack Integration

- **Real-time alerts** for critical errors
- **Performance notifications** for degradation
- **Release notifications** for deployments

### Jira Integration

- **Automatic issue creation** from Sentry events
- **Issue linking** for tracking
- **Release tracking** for project management

## Future Enhancements

- [ ] Source map upload for better error tracking
- [ ] Release health monitoring
- [ ] Custom performance metrics
- [ ] Advanced filtering and grouping
- [ ] Integration with CI/CD pipelines
- [ ] Custom alert rules
- [ ] User feedback collection
- [ ] A/B testing integration
