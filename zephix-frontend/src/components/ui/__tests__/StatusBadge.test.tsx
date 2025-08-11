import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders dark theme by default', () => {
    render(<StatusBadge />);
    
    const badge = screen.getByRole('status', { name: /private beta/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('border-white/20', 'bg-white/5', 'text-white/80');
  });

  it('renders light theme when onDark is false', () => {
    render(<StatusBadge onDark={false} />);
    
    const badge = screen.getByRole('status', { name: /private beta/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('border-[var(--primary-600)]', 'bg-[var(--primary-50)]', 'text-[var(--primary-600)]');
  });

  it('has proper accessibility attributes', () => {
    render(<StatusBadge />);
    
    const badge = screen.getByRole('status', { name: /private beta/i });
    expect(badge).toHaveAttribute('aria-label', 'Private beta');
    expect(badge).toHaveAttribute('role', 'status');
  });

  it('has proper styling classes', () => {
    render(<StatusBadge />);
    
    const badge = screen.getByRole('status', { name: /private beta/i });
    expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1.5', 'rounded-full', 'px-2.5', 'py-1', 'text-xs', 'font-medium');
  });

  it('includes status indicator dot', () => {
    render(<StatusBadge />);
    
    const dot = screen.getByRole('status', { name: /private beta/i }).querySelector('span');
    expect(dot).toHaveClass('h-1.5', 'w-1.5', 'rounded-full', 'bg-[var(--primary-600)]');
  });
});
