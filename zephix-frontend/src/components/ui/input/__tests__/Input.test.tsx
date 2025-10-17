import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Input } from '../Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    
    const input = screen.getByLabelText(/email/i);
    expect(input).toBeInTheDocument();
    expect(input).toBeInTheDocument();
  });

  it('renders with help text', () => {
    render(<Input label="Password" help="Must be at least 8 characters" />);
    
    const input = screen.getByLabelText(/password/i);
    const helpText = screen.getByText(/must be at least 8 characters/i);
    
    expect(input).toHaveAttribute('aria-describedby');
    expect(helpText).toBeInTheDocument();
  });

  it('renders with error state', () => {
    render(<Input label="Email" error="Invalid email format" />);
    
    const input = screen.getByLabelText(/email/i);
    const errorText = screen.getByText(/invalid email format/i);
    
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
    expect(errorText).toHaveAttribute('role', 'alert');
  });

  it('associates help and error text with input', () => {
    render(
      <Input 
        label="Email" 
        help="Enter your email address"
        error="This field is required"
      />
    );
    
    const input = screen.getByLabelText(/email/i);
    const describedBy = input.getAttribute('aria-describedby');
    
    expect(describedBy).toContain('help');
    expect(describedBy).toContain('error');
  });
});
