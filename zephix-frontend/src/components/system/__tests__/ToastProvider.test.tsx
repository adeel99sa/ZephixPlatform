import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Toaster } from 'sonner';
import { toast } from 'sonner';

describe('Toast Provider', () => {
  it('renders toast messages when triggered', async () => {
    render(<Toaster data-testid="sonner-toaster" />);

    act(() => {
      toast.success('Action completed');
    });

    // Sonner renders toasts async
    const toastEl = await screen.findByText('Action completed', {}, { timeout: 3000 });
    expect(toastEl).toBeInTheDocument();
  });

  it('renders error toasts', async () => {
    render(<Toaster />);

    act(() => {
      toast.error('Something failed');
    });

    const toastEl = await screen.findByText('Something failed', {}, { timeout: 3000 });
    expect(toastEl).toBeInTheDocument();
  });
});
