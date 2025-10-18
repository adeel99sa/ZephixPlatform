import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Test Checkbox" />);
    
    const checkbox = screen.getByLabelText(/test checkbox/i);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });

  it('renders with help text', () => {
    render(<Checkbox label="Test" help="This is help text" />);
    
    const checkbox = screen.getByLabelText(/test/i);
    const helpText = screen.getByText(/this is help text/i);
    
    expect(helpText).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('aria-describedby', helpText.id);
  });

  it('renders with error message', () => {
    render(<Checkbox label="Test" error="This is an error" />);
    
    const checkbox = screen.getByLabelText(/test/i);
    const errorMessage = screen.getByText(/this is an error/i);
    
    expect(errorMessage).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('aria-describedby', errorMessage.id);
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles click events', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Test" onChange={onChange} />);
    
    const checkbox = screen.getByLabelText(/test/i);
    fireEvent.click(checkbox);
    
    expect(onChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Checkbox label="Test" disabled />);
    
    const checkbox = screen.getByLabelText(/test/i);
    expect(checkbox).toBeDisabled();
  });

  it('can be checked by default', () => {
    render(<Checkbox label="Test" defaultChecked />);
    
    const checkbox = screen.getByLabelText(/test/i);
    expect(checkbox).toBeChecked();
  });
});
