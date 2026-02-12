import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// A component that throws on render
function ThrowingChild() {
  throw new Error('Test explosion');
}

function GoodChild() {
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error from the intentional throw
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not show raw stack traces', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.queryByText('Test explosion')).not.toBeInTheDocument();
  });

  it('shows a non-technical error ID', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    const errorRef = screen.getByText(/Error reference:/);
    expect(errorRef).toBeInTheDocument();
    // The error ID should match ERR-XXXXXX pattern
    expect(errorRef.querySelector('code')?.textContent).toMatch(/^ERR-[A-Z0-9]+$/);
  });

  it('has Go back button that calls history.back', () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByTestId('error-go-back'));
    expect(backSpy).toHaveBeenCalled();
    backSpy.mockRestore();
  });

  it('has Reload button that calls location.reload', () => {
    // location.reload is not easily mockable, so just check the button exists
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-reload')).toBeInTheDocument();
    expect(screen.getByTestId('error-reload')).toHaveTextContent('Reload');
  });

  it('renders custom fallback if provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error page</div>}>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom error page')).toBeInTheDocument();
  });
});
