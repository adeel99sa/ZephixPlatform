import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Select } from '../Select';

const testOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

describe('Select', () => {
  it('renders with label', () => {
    render(<Select label="Test Select" options={testOptions} />);
    
    expect(screen.getByLabelText(/test select/i)).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Select placeholder="Choose an option" options={testOptions} />);
    
    expect(screen.getByText('Choose an option')).toBeInTheDocument();
  });

  it('renders with help text', () => {
    render(<Select label="Test" help="This is help text" options={testOptions} />);
    
    const select = screen.getByLabelText(/test/i);
    const helpText = screen.getByText(/this is help text/i);
    
    expect(helpText).toBeInTheDocument();
    expect(select).toHaveAttribute('aria-describedby', helpText.id);
  });

  it('renders with error message', () => {
    render(<Select label="Test" error="This is an error" options={testOptions} />);
    
    const select = screen.getByLabelText(/test/i);
    const errorMessage = screen.getByText(/this is an error/i);
    
    expect(errorMessage).toBeInTheDocument();
    expect(select).toHaveAttribute('aria-describedby', errorMessage.id);
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveClass('border-destructive');
  });

  it('prefers error message over help text', () => {
    render(
      <Select 
        label="Test" 
        help="Some help" 
        error="Some error" 
        options={testOptions} 
      />
    );
    
    const select = screen.getByLabelText(/test/i);
    const errorMessage = screen.getByText(/some error/i);
    
    expect(errorMessage).toBeInTheDocument();
    expect(screen.queryByText(/some help/i)).not.toBeInTheDocument();
    expect(select).toHaveAttribute('aria-describedby', errorMessage.id);
  });

  it('handles selection change', () => {
    const onChange = vi.fn();
    render(<Select options={testOptions} onChange={onChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(onChange).toHaveBeenCalled();
  });

  it('disables options when specified', () => {
    render(<Select options={testOptions} />);
    
    const option3 = screen.getByText('Option 3');
    expect(option3.closest('option')).toBeDisabled();
  });
});
