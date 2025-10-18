import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormField } from '../FormField';
import { Input } from '../../input/Input';

describe('FormField', () => {
  it('renders with label and children', () => {
    render(
      <FormField label="Test Field">
        <Input placeholder="Enter text" />
      </FormField>
    );
    
    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with required indicator', () => {
    render(
      <FormField label="Test Field" required>
        <Input placeholder="Enter text" />
      </FormField>
    );
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <FormField label="Test Field" description="This is a description">
        <Input placeholder="Enter text" />
      </FormField>
    );
    
    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });

  it('renders with error message', () => {
    render(
      <FormField label="Test Field" error="This is an error">
        <Input placeholder="Enter text" />
      </FormField>
    );
    
    const errorMessage = screen.getByText('This is an error');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-destructive');
  });

  it('passes aria attributes to child', () => {
    render(
      <FormField label="Test Field" error="This is an error">
        <Input placeholder="Enter text" />
      </FormField>
    );
    
    const input = screen.getByPlaceholderText('Enter text');
    const errorMessage = screen.getByText('This is an error');
    
    expect(input).toHaveAttribute('aria-describedby', errorMessage.id);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
